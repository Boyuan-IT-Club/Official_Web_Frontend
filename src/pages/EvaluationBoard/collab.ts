import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

/**
 * 协同评价表的 Yjs 绑定层。
 *
 * 文档结构由协同服务（collab-server/src/doc-model.js）与 Java 物化接口三方共同约定，
 * 本文件的常量与键名必须与之逐字一致，否则前端写入的单元格无法被物化：
 *
 *   meta:    Y.Map    { cycleId, locked, seededAt, interviewerNames }
 *   columns: Y.Array<Y.Map>  列定义
 *   rows:    Y.Map<scheduleId, Y.Map>
 *              ├─ _info      候选人只读快照（服务端播种与刷新）
 *              └─ '<colId>'  单元格，一个候选人只有一份评价
 *
 * 同场次的几位面试官面同一个候选人，共同维护这一份评价：任何一位绑定在该场次上的
 * 面试官都能补分数、接着写评语，并发写同一字段由 CRDT 收敛。键上不带面试官后缀，
 * 「谁改过」由协同服务旁路记录后写进物化结果，前端不参与署名的生成。
 *
 * 本层不感知渲染方式，只负责「读一格/写一格 + 在线状态」，UI 用什么组件都行。
 */

const SEPARATOR = ':';

/** 评语列：用 Y.Text 承载，支持多人同时编辑的字符级合并 */
export const COMMENT_COL = 'comment';
/** 推荐意见列（共同结论）：1倾向通过 2待定 3不倾向 */
export const RECOMMENDATION_COL = 'recommendation';
/** 状态：1进行中 2已定稿 */
export const STATUS_COL = 'status';

const DIMENSION_COL_PREFIX = 'dim';

/** 评分维度的列ID，形如 dim:12 */
/**
 * 每个维度自己的评语键，形如 dim:12:note。
 *
 * 原先整行只有一个 comment 总评框，面试官得把几个维度的话揉进一段，
 * 事后分不清哪句针对哪一项、是谁写的。与服务端 doc-model.js 的
 * dimensionNoteColId 必须保持一致，否则两边读写的不是同一格。
 */
export function dimensionNoteColId(dimensionId: number): string {
  return `${dimensionColId(dimensionId)}${SEPARATOR}note`;
}

export function dimensionColId(dimensionId: number): string {
  return `${DIMENSION_COL_PREFIX}${SEPARATOR}${dimensionId}`;
}

export type BoardStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface BoardColumn {
  id: string;
  dimensionId?: number;
  label: string;
  type: 'score' | 'text' | 'select';
  maxScore?: number;
  weight?: number;
  width?: number;
  order: number;
  options?: { value: number; label: string }[];
}

/** 候选人行的只读快照 */
export interface BoardRow {
  scheduleId: number;
  resumeId: number;
  userId: number;
  candidateName: string;
  account?: string;
  deptId?: number;
  deptName?: string;
  sessionId?: number;
  /** 面试地点（取自场次） */
  location?: string;
  interviewTime?: string;
  interviewerUserIds: number[];
  /** 已被移出名单，保留已填评价但置灰 */
  removed: boolean;
}

/** 某位候选人的那份共享评价（直接读自协同文档，比物化结果更实时） */
export interface RowEvaluation {
  scores: Record<string, number>;
  totalScore: number | null;
  comment: string;
  recommendation: number | null;
  status: number;
  /** 一格都没填 */
  empty: boolean;
}

/** 停止输入多久后收回「正在输入」。太短会闪，太长会在对方停手后仍亮着 */
const TYPING_IDLE_MS = 2500;

/**
 * 一位同事在某个文本字段里的光标/选区。
 *
 * anchor/head 存的是 Yjs 相对位置（RelativePosition）的 JSON 而不是普通下标：
 * 两个人同时编辑同一段评语时，普通下标会因为对方的插入/删除而指错字，
 * 相对位置钉在字符上，文本怎么变都指向原来那个缝隙。
 * null 表示该格还没有 Y.Text（谁都没写过字），此时光标就在 0 处。
 */
export interface PeerCursor {
  scheduleId: number;
  field: string;
  anchor: object | null;
  head: object | null;
}

export interface BoardPeer {
  clientId: number;
  userId: number;
  name: string;
  color: string;
  /** 当前正在查看/编辑的候选人 */
  activeScheduleId: number | null;
  /**
   * 正在输入的字段（评语用 COMMENT_COL，维度评语用 note:{dimensionId}，
   * 分数用列 id）。null 表示此刻没在打字。
   *
   * 靠「本地定时清除」而不是「远端判断时间戳过期」：过期判断要各端时钟一致，
   * 而且没有新事件时不会重新渲染，头像会一直亮着。
   */
  typingField: string | null;
  /** 正在聚焦的文本框里的光标/选区，没聚焦文本框时为 null */
  cursor: PeerCursor | null;
}

/** 在线状态的头像配色，按 userId 取模，保证同一个人到处都是同一个颜色 */
const PEER_COLORS = [
  '#1677ff', '#52c41a', '#fa8c16', '#eb2f96',
  '#722ed1', '#13c2c2', '#f5222d', '#a0d911',
];

export function peerColor(userId: number): string {
  return PEER_COLORS[Math.abs(userId) % PEER_COLORS.length];
}

/**
 * 协同服务地址。未显式配置时按当前站点推导，生产由 nginx 把 /collab 反代到协同服务。
 */
export function resolveCollabUrl(): string {
  const configured = process.env.REACT_APP_COLLAB_WS_URL;
  if (configured) return configured;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/collab`;
}

/**
 * Hocuspocus 把服务端 onAuthenticate / onLoadDocument 的任何失败都统一回报成
 * `permission-denied`，错误原文不会传到浏览器——于是"后端漏配服务令牌"这类配置问题，
 * 在界面上和"你没有评价权限"长得一模一样。协同服务因此额外提供了 GET /collab/diag，
 * 连接失败时拉一次，把真正的原因和下一步动作显示出来。
 */
async function fetchCollabDiagnosis(docName: string): Promise<string | null> {
  try {
    const base = resolveCollabUrl().replace(/^ws/, 'http');
    const res = await fetch(`${base}/diag`, { cache: 'no-store' });
    if (!res.ok) return null;
    const diag = await res.json();

    const forDoc = diag?.docs?.[docName];
    if (forDoc?.title) {
      return forDoc.hint ? `${forDoc.title}。${forDoc.hint}` : forDoc.title;
    }
    if (diag?.backend?.status === 'unauthorized') {
      return '协同服务未通过后端的服务间认证：后端缺少 COLLAB_SERVICE_TOKEN 或两侧取值不一致。';
    }
    if (diag?.backend?.status === 'unreachable') {
      return '协同服务连不上后端服务，请稍后重试或联系管理员。';
    }
    if (diag?.db?.status !== 'ok') {
      return '协同服务无法访问数据库，请联系管理员。';
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 把整串文本的改动折算成最小的 insert/delete。
 *
 * 直接清空重写会让并发编辑同一段评语的两个人互相抹掉对方刚敲的字，
 * 只提交差异才能用上 Y.Text 的字符级合并。
 */
export function applyTextDiff(text: Y.Text, next: string): void {
  const prev = text.toString();
  if (prev === next) return;

  let start = 0;
  const maxStart = Math.min(prev.length, next.length);
  while (start < maxStart && prev[start] === next[start]) start += 1;

  let tail = 0;
  const maxTail = Math.min(prev.length - start, next.length - start);
  while (tail < maxTail && prev[prev.length - 1 - tail] === next[next.length - 1 - tail]) tail += 1;

  const deleteLength = prev.length - start - tail;
  if (deleteLength > 0) text.delete(start, deleteLength);
  const inserted = next.slice(start, next.length - tail);
  if (inserted) text.insert(start, inserted);
}

function cellOf(doc: Y.Doc, scheduleId: number, field: string): unknown {
  const rowMap = doc.getMap<Y.Map<any>>('rows').get(String(scheduleId));
  return rowMap instanceof Y.Map ? rowMap.get(field) : undefined;
}

/**
 * 把「某格文本里的第 N 个字符间隙」编码成可广播的光标状态。
 * 该格还不是 Y.Text（没人写过字）时退化为 null，解码端按 0 处理。
 */
export function encodeCursor(
  doc: Y.Doc,
  scheduleId: number,
  field: string,
  anchor: number,
  head: number,
): PeerCursor {
  const cell = cellOf(doc, scheduleId, field);
  if (!(cell instanceof Y.Text)) {
    return { scheduleId, field, anchor: null, head: null };
  }
  const clamp = (index: number) => Math.max(0, Math.min(index, cell.length));
  return {
    scheduleId,
    field,
    anchor: Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(cell, clamp(anchor))),
    head: Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(cell, clamp(head))),
  };
}

/**
 * 把同事广播的光标解回当前文档里的下标。
 * 位置钉不回这格文本时（比如那格在他离线期间被整个重建）返回 null，宁可不画也别画错。
 */
export function decodeCursor(
  doc: Y.Doc,
  cursor: PeerCursor,
): { anchor: number; head: number } | null {
  if (cursor.anchor === null || cursor.head === null) {
    return { anchor: 0, head: 0 };
  }
  const cell = cellOf(doc, cursor.scheduleId, cursor.field);
  if (!(cell instanceof Y.Text)) return null;

  const resolve = (raw: object): number | null => {
    try {
      const abs = Y.createAbsolutePositionFromRelativePosition(
        Y.createRelativePositionFromJSON(raw),
        doc,
      );
      return abs && abs.type === cell ? abs.index : null;
    } catch {
      return null;
    }
  };

  const anchor = resolve(cursor.anchor);
  const head = resolve(cursor.head);
  if (anchor === null || head === null) return null;
  return { anchor, head };
}

function readColumns(doc: Y.Doc): BoardColumn[] {
  const columns: BoardColumn[] = [];
  doc.getArray<Y.Map<any>>('columns').forEach((item) => {
    if (!(item instanceof Y.Map)) return;
    columns.push({
      id: String(item.get('id')),
      dimensionId: item.get('dimensionId') as number | undefined,
      label: String(item.get('label') ?? ''),
      type: (item.get('type') as BoardColumn['type']) ?? 'text',
      maxScore: item.get('maxScore') as number | undefined,
      weight: item.get('weight') as number | undefined,
      width: item.get('width') as number | undefined,
      order: Number(item.get('order') ?? 0),
      options: item.get('options') as BoardColumn['options'],
    });
  });
  return columns.sort((a, b) => a.order - b.order);
}

function readRows(doc: Y.Doc): BoardRow[] {
  const rows: BoardRow[] = [];
  doc.getMap<Y.Map<any>>('rows').forEach((rowMap) => {
    if (!(rowMap instanceof Y.Map)) return;
    const info = rowMap.get('_info');
    if (!(info instanceof Y.Map)) return;
    const interviewerUserIds = info.get('interviewerUserIds');
    rows.push({
      scheduleId: Number(info.get('scheduleId')),
      resumeId: Number(info.get('resumeId')),
      userId: Number(info.get('userId')),
      candidateName: String(info.get('candidateName') ?? ''),
      account: info.get('account') as string | undefined,
      deptId: info.get('deptId') as number | undefined,
      deptName: info.get('deptName') as string | undefined,
      sessionId: info.get('sessionId') as number | undefined,
      location: info.get('location') as string | undefined,
      interviewTime: info.get('interviewTime') as string | undefined,
      interviewerUserIds: Array.isArray(interviewerUserIds) ? interviewerUserIds.map(Number) : [],
      removed: info.get('removed') === true,
    });
  });

  return rows.sort((a, b) => {
    const timeA = a.interviewTime ?? '';
    const timeB = b.interviewTime ?? '';
    if (timeA !== timeB) return timeA < timeB ? -1 : 1;
    return a.candidateName.localeCompare(b.candidateName, 'zh-CN');
  });
}

function cellText(value: unknown): string {
  if (value instanceof Y.Text) return value.toString();
  return value === null || value === undefined ? '' : String(value);
}

/** 加权总分 = Σ(维度得分 × 维度权重)，与 Java 物化时的算法保持一致 */
export function weightedTotal(
  scores: Record<string, number>,
  columns: BoardColumn[],
): number | null {
  let total = 0;
  let scored = false;
  for (const column of columns) {
    if (column.type !== 'score') continue;
    const score = scores[column.id];
    if (score === undefined || score === null || Number.isNaN(score)) continue;
    total += score * (column.weight ?? 1);
    scored = true;
  }
  return scored ? Math.round(total * 100) / 100 : null;
}

export interface UseCollabBoardOptions {
  /** 为空表示评价表尚未开启，此时不建立连接 */
  docName?: string;
  token?: string | null;
  userId: number;
  userName: string;
}

export interface CollabBoard {
  status: BoardStatus;
  /** 首次与服务端完成同步 */
  synced: boolean;
  /** 表已锁定或服务端只授予了只读权限 */
  readOnly: boolean;
  locked: boolean;
  errorMessage: string | null;
  columns: BoardColumn[];
  rows: BoardRow[];
  peers: BoardPeer[];
  /** 面试官 {userId: 姓名}，行里只存 ID，展示「谁评的」要靠它 */
  interviewerNames: Record<number, string>;
  /** 文档每次变化自增，供 UI 触发重渲染 */
  version: number;
  /** 我是否被排在这场面试上（决定能不能写这一行） */
  canEdit: (row: BoardRow) => boolean;
  /** 读该行某一列的值 */
  readCell: (scheduleId: number, colId: string) => string;
  /** 读该行那份共享评价 */
  readEvaluation: (scheduleId: number) => RowEvaluation;
  writeScore: (scheduleId: number, colId: string, score: number | null) => void;
  writeComment: (scheduleId: number, text: string) => void;
  /** 写某个维度的独立评语（Y.Text，多人同时编辑走字符级合并） */
  writeDimensionNote: (scheduleId: number, dimensionId: number, text: string) => void;
  writeRecommendation: (scheduleId: number, value: number | null) => void;
  writeStatus: (scheduleId: number, status: number) => void;
  /** 广播我正在看哪位候选人 */
  setActiveRow: (scheduleId: number | null) => void;
  /**
   * 广播「我正在输入某个字段」。每次调用都会把自动清除的计时器推后，
   * 停手 TYPING_IDLE_MS 后自动收回 —— 否则对方停下来不动，
   * 别人看到的仍是「正在输入」。
   */
  setTyping: (field: string | null) => void;
  /**
   * 广播我在某个文本字段里的光标/选区（选区收起时 anchor === head）。
   * 与 typing 不同，光标不做超时自动收回——人在字段里停着不动，
   * 光标就该一直立在那里；离开字段时调 clearCursor。
   */
  setCursor: (scheduleId: number, field: string, anchor: number, head: number) => void;
  /** 收回自己的光标（失焦/关闭面板时调用） */
  clearCursor: () => void;
  /** 把同事广播的光标解成当前文本里的下标；解不出来（已失效）返回 null */
  resolveCursor: (peer: BoardPeer) => { anchor: number; head: number } | null;
}

/**
 * 建立协同连接并把文档读写包装成普通函数。
 *
 * 组件通过 version 感知变化后再调 readXxx 取值，而不是把整份文档镜像成 React state——
 * 评价表可能有几百行，每敲一个字就重建一次快照并不划算。
 */
export function useCollabBoard(options: UseCollabBoardOptions): CollabBoard {
  const { docName, token, userId, userName } = options;

  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);

  const typingTimer = useRef<number | null>(null);
  const [status, setStatus] = useState<BoardStatus>('connecting');
  const [synced, setSynced] = useState(false);
  const [scopeReadOnly, setScopeReadOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [peers, setPeers] = useState<BoardPeer[]>([]);

  useEffect(() => {
    if (!docName || !token) {
      setStatus('disconnected');
      return undefined;
    }

    const doc = new Y.Doc();
    docRef.current = doc;
    setSynced(false);
    setErrorMessage(null);
    setStatus('connecting');

    // 文档变化频率可能很高（有人连续打字），按帧合并成一次重渲染
    let frame: number | null = null;
    const bumpVersion = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        setVersion((value) => value + 1);
      });
    };
    doc.on('update', bumpVersion);

    const provider = new HocuspocusProvider({
      url: resolveCollabUrl(),
      name: docName,
      document: doc,
      token,
      onStatus: ({ status: next }) => {
        setStatus(next === 'connected' ? 'connected' : 'disconnected');
      },
      onAuthenticated: ({ scope }) => {
        setScopeReadOnly(scope === 'readonly');
        setErrorMessage(null);
      },
      onAuthenticationFailed: ({ reason }) => {
        setStatus('error');
        // reason 基本恒为 permission-denied，对定位毫无帮助，先摆上占位再问自检端点要真相
        setErrorMessage('连接被拒绝，正在查询原因…');
        void fetchCollabDiagnosis(docName).then((detail) => {
          setErrorMessage(detail ?? (reason ? `协同服务拒绝了连接（${reason}）` : '协同服务拒绝了连接'));
        });
      },
      onSynced: ({ state }) => {
        setSynced(state);
        bumpVersion();
      },
    });
    providerRef.current = provider;

    const awareness = provider.awareness;
    awareness?.setLocalStateField('user', {
      userId,
      name: userName,
      color: peerColor(userId),
    });

    const syncPeers = () => {
      if (!awareness) return;
      const list: BoardPeer[] = [];
      awareness.getStates().forEach((state: any, clientId: number) => {
        const user = state?.user;
        if (!user || clientId === awareness.clientID) return;
        list.push({
          clientId,
          userId: Number(user.userId),
          name: String(user.name ?? '匿名'),
          color: String(user.color ?? peerColor(Number(user.userId))),
          activeScheduleId: state?.active?.scheduleId ?? null,
          typingField: state?.typing?.field ?? null,
          cursor: state?.cursor ?? null,
        });
      });
      setPeers(list);
    };
    awareness?.on('change', syncPeers);
    syncPeers();

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      doc.off('update', bumpVersion);
      awareness?.off('change', syncPeers);
      provider.destroy();
      doc.destroy();
      providerRef.current = null;
      docRef.current = null;
      setPeers([]);
    };
  }, [docName, token, userId, userName]);

  const columns = useMemo(
    () => (docRef.current ? readColumns(docRef.current) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, docName],
  );

  const rows = useMemo(
    () => (docRef.current ? readRows(docRef.current) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, docName],
  );

  const locked = useMemo(() => {
    const doc = docRef.current;
    return doc ? doc.getMap('meta').get('locked') === true : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, docName]);

  const interviewerNames = useMemo<Record<number, string>>(() => {
    const doc = docRef.current;
    const names = doc?.getMap('meta').get('interviewerNames');
    return names && typeof names === 'object' ? (names as Record<number, string>) : {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, docName]);

  const readOnly = locked || scopeReadOnly || status !== 'connected';

  const rowMapOf = useCallback((scheduleId: number): Y.Map<any> | null => {
    const doc = docRef.current;
    if (!doc) return null;
    const rowMap = doc.getMap<Y.Map<any>>('rows').get(String(scheduleId));
    return rowMap instanceof Y.Map ? rowMap : null;
  }, []);

  const canEdit = useCallback(
    (row: BoardRow) => !readOnly && !row.removed && row.interviewerUserIds.includes(userId),
    [readOnly, userId],
  );

  const readCell = useCallback(
    (scheduleId: number, colId: string) => {
      const rowMap = rowMapOf(scheduleId);
      return rowMap ? cellText(rowMap.get(colId)) : '';
    },
    [rowMapOf],
  );

  const readEvaluation = useCallback(
    (scheduleId: number): RowEvaluation => {
      const item: RowEvaluation = {
        scores: {},
        totalScore: null,
        comment: '',
        recommendation: null,
        status: 1,
        empty: true,
      };

      const rowMap = rowMapOf(scheduleId);
      if (!rowMap) return item;

      rowMap.forEach((raw, key) => {
        if (key === '_info') return;
        const text = cellText(raw);
        if (key === COMMENT_COL) {
          item.comment = text;
          if (text) item.empty = false;
        } else if (key === RECOMMENDATION_COL) {
          item.recommendation = text === '' ? null : Number(text);
          if (text) item.empty = false;
        } else if (key === STATUS_COL) {
          item.status = Number(text) === 2 ? 2 : 1;
        } else if (text !== '') {
          item.scores[key] = Number(text);
          item.empty = false;
        }
      });

      item.totalScore = weightedTotal(item.scores, columns);
      return item;
    },
    [rowMapOf, columns],
  );

  /** 所有写入都打上本地 origin，协同服务据此记录「谁写了哪一格」 */
  const transact = useCallback((mutate: (rowMap: Y.Map<any>) => void, scheduleId: number) => {
    const doc = docRef.current;
    const rowMap = rowMapOf(scheduleId);
    if (!doc || !rowMap) return;
    doc.transact(() => mutate(rowMap), 'local');
  }, [rowMapOf]);

  const writeScore = useCallback(
    (scheduleId: number, colId: string, score: number | null) => {
      transact((rowMap) => {
        if (score === null || Number.isNaN(score)) {
          rowMap.delete(colId);
        } else {
          rowMap.set(colId, score);
        }
      }, scheduleId);
    },
    [transact],
  );

  const writeComment = useCallback(
    (scheduleId: number, text: string) => {
      transact((rowMap) => {
        let target = rowMap.get(COMMENT_COL);
        if (!(target instanceof Y.Text)) {
          target = new Y.Text();
          rowMap.set(COMMENT_COL, target);
        }
        applyTextDiff(target as Y.Text, text);
      }, scheduleId);
    },
    [transact],
  );

  const writeDimensionNote = useCallback(
    (scheduleId: number, dimensionId: number, text: string) => {
      const colId = dimensionNoteColId(dimensionId);
      transact((rowMap) => {
        let target = rowMap.get(colId);
        if (!(target instanceof Y.Text)) {
          // 兜底新建：服务端播种时已预建，但管理员新增维度后、对账跑到之前会缺
          target = new Y.Text();
          rowMap.set(colId, target);
        }
        applyTextDiff(target as Y.Text, text);
      }, scheduleId);
    },
    [transact],
  );

  const writeRecommendation = useCallback(
    (scheduleId: number, value: number | null) => {
      transact((rowMap) => {
        if (value === null) {
          rowMap.delete(RECOMMENDATION_COL);
        } else {
          rowMap.set(RECOMMENDATION_COL, value);
        }
      }, scheduleId);
    },
    [transact],
  );

  const writeStatus = useCallback(
    (scheduleId: number, status: number) => {
      transact((rowMap) => {
        rowMap.set(STATUS_COL, status);
      }, scheduleId);
    },
    [transact],
  );

  const setActiveRow = useCallback((scheduleId: number | null) => {
    providerRef.current?.awareness?.setLocalStateField('active', { scheduleId });
  }, []);

  const setTyping = useCallback((field: string | null) => {
    const awarenessRef = providerRef.current?.awareness;
    if (!awarenessRef) return;

    if (typingTimer.current !== null) {
      window.clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }
    awarenessRef.setLocalStateField('typing', field ? { field } : null);
    if (!field) return;

    // 停手后自动收回。不这么做的话，对方看到的「正在输入」会一直挂着
    typingTimer.current = window.setTimeout(() => {
      typingTimer.current = null;
      providerRef.current?.awareness?.setLocalStateField('typing', null);
    }, TYPING_IDLE_MS);
  }, []);

  const setCursor = useCallback((scheduleId: number, field: string, anchor: number, head: number) => {
    const doc = docRef.current;
    const awarenessRef = providerRef.current?.awareness;
    if (!doc || !awarenessRef) return;
    awarenessRef.setLocalStateField('cursor', encodeCursor(doc, scheduleId, field, anchor, head));
  }, []);

  const clearCursor = useCallback(() => {
    providerRef.current?.awareness?.setLocalStateField('cursor', null);
  }, []);

  const resolveCursor = useCallback((peer: BoardPeer) => {
    const doc = docRef.current;
    if (!doc || !peer.cursor) return null;
    return decodeCursor(doc, peer.cursor);
  }, []);

  // 关掉抽屉/断开连接时把打字状态一起收掉，别留一个永久亮着的提示
  useEffect(() => () => {
    if (typingTimer.current !== null) {
      window.clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }
  }, []);

  return {
    status,
    synced,
    readOnly,
    locked,
    errorMessage,
    columns,
    rows,
    peers,
    interviewerNames,
    version,
    canEdit,
    readCell,
    readEvaluation,
    writeScore,
    writeComment,
    writeDimensionNote,
    writeRecommendation,
    writeStatus,
    setActiveRow,
    setTyping,
    setCursor,
    clearCursor,
    resolveCursor,
  };
}

/**
 * 把一个文本输入框接到协同文档上。
 *
 * 输入过程中不拿文档内容回灌输入框，否则每次自己敲字都会把光标弹到末尾；
 * 但一旦发现文档里的内容不是自己刚写下的那份（说明有人并发改了同一格），
 * 就以文档为准强制回灌——光标跳一下，总好过把对方刚写的话覆盖掉。
 */
export function useSharedText(
  read: () => string,
  write: (text: string) => void,
  version: number,
): [string, (text: string) => void] {
  const [value, setValue] = useState(read);
  const lastWritten = useRef<string | null>(null);

  useEffect(() => {
    const remote = read();
    if (remote !== lastWritten.current) {
      lastWritten.current = null;
      setValue(remote);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const change = useCallback(
    (next: string) => {
      lastWritten.current = next;
      setValue(next);
      write(next);
    },
    [write],
  );

  return [value, change];
}
