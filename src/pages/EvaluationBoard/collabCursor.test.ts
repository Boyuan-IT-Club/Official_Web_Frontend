// 同事光标的编解码守卫。
//
// 光标广播的是 Yjs 相对位置而不是普通下标，这组用例钉住选它的理由：
// 两个人同时写同一段评语时，普通下标会因为对方的插入而指错字，
// 相对位置必须在文本变化后仍指向原来那个字符间隙。
import * as Y from 'yjs';
import { COMMENT_COL, decodeCursor, encodeCursor } from './collab';

/** 造一份带评语格的最小协同文档，返回那格 Y.Text */
function makeDoc(scheduleId: number, comment: string): { doc: Y.Doc; text: Y.Text } {
  const doc = new Y.Doc();
  const rowMap = new Y.Map<any>();
  doc.getMap('rows').set(String(scheduleId), rowMap);
  const text = new Y.Text();
  rowMap.set(COMMENT_COL, text);
  text.insert(0, comment);
  return { doc, text };
}

describe('光标位置的编解码', () => {
  it('编码后原样解回', () => {
    const { doc } = makeDoc(11, '表现不错');
    const cursor = encodeCursor(doc, 11, COMMENT_COL, 2, 4);
    expect(decodeCursor(doc, cursor)).toEqual({ anchor: 2, head: 4 });
  });

  it('别人在光标前面插入文字后，光标仍指向原来的字符间隙', () => {
    const { doc, text } = makeDoc(11, '沟通清晰');
    const cursor = encodeCursor(doc, 11, COMMENT_COL, 2, 2); // 停在「沟通|清晰」

    text.insert(0, '补充：'); // 同事在开头插了三个字

    expect(decodeCursor(doc, cursor)).toEqual({ anchor: 5, head: 5 });
  });

  it('光标后面的改动不影响解出的位置', () => {
    const { doc, text } = makeDoc(11, '沟通清晰');
    const cursor = encodeCursor(doc, 11, COMMENT_COL, 2, 2);

    text.insert(4, '，逻辑严谨');

    expect(decodeCursor(doc, cursor)).toEqual({ anchor: 2, head: 2 });
  });

  it('那格还没人写过字（不是 Y.Text）时退化为 0 处', () => {
    const doc = new Y.Doc();
    doc.getMap('rows').set('11', new Y.Map());

    const cursor = encodeCursor(doc, 11, COMMENT_COL, 3, 3);
    expect(cursor.anchor).toBeNull();
    expect(decodeCursor(doc, cursor)).toEqual({ anchor: 0, head: 0 });
  });

  it('越界下标编码时被夹回文本长度内', () => {
    const { doc } = makeDoc(11, '短');
    const cursor = encodeCursor(doc, 11, COMMENT_COL, 99, 99);
    expect(decodeCursor(doc, cursor)).toEqual({ anchor: 1, head: 1 });
  });

  it('位置钉不回这格文本时返回 null，宁可不画也别画错', () => {
    const { doc } = makeDoc(11, '内容');
    const cursor = encodeCursor(doc, 11, COMMENT_COL, 1, 1);

    // 光标主人所在的格在另一份文档里（模拟这格被整个重建后位置失效）
    const other = makeDoc(11, '内容').doc;
    const rowMap = other.getMap<Y.Map<any>>('rows').get('11') as Y.Map<any>;
    rowMap.set(COMMENT_COL, new Y.Text());

    expect(decodeCursor(other, cursor)).toBeNull();
  });
});
