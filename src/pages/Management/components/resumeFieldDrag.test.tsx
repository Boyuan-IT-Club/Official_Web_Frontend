// 简历字段面板的拖拽回归：用模拟指针把第 1 个字段拖到第 2 个之下，
// 断言 onFieldsChange 收到换位后的顺序。
//
// 拖不动这件事在线上出过两回（嵌套 DndContext、全局下标编错），
// 都是"拖得动、松手没反应"的静默失败——只有真的把 pointerdown/move/up
// 走一遍才能守住。jsdom 没有布局，所以给可排序节点手工喂矩形。
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ResumeFieldPanel from './ResumeFieldPanel';

// jsdom 没有 PointerEvent；dnd-kit 的 PointerSensor 要读 isPrimary/button
class PointerEventPolyfill extends MouseEvent {
  pointerId: number; isPrimary: boolean; pointerType: string;
  constructor(type: string, init: any = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.isPrimary = init.isPrimary ?? true;
    this.pointerType = init.pointerType ?? 'mouse';
  }
}

const FIELDS: any[] = [
  { fieldId: 1, cycleId: 1, fieldKey: 'name', fieldLabel: '姓名', fieldType: 'text', category: 1, sortOrder: 1, isActive: true, isRequired: true },
  { fieldId: 2, cycleId: 1, fieldKey: 'student_id', fieldLabel: '学号', fieldType: 'text', category: 1, sortOrder: 2, isActive: true, isRequired: true },
];

/** 按字段卡片在文档里的次序造矩形：第 i 张卡占 [i*100, i*100+80] */
function rectFor(el: Element): DOMRect {
  const card = el.matches('.resume-field-panel__field')
    ? el
    : el.querySelector(':scope > .resume-field-panel__field') ?? el.closest('.resume-field-panel__field');
  const cards = Array.from(document.querySelectorAll('.resume-field-panel__field'));
  const idx = card ? cards.indexOf(card) : -1;
  const top = idx >= 0 ? idx * 100 : 0;
  const height = idx >= 0 ? 80 : 0;
  return { x: 0, y: top, top, left: 0, width: 400, height, right: 400, bottom: top + height, toJSON: () => ({}) } as DOMRect;
}

describe('简历字段面板拖拽排序', () => {
  const originalRect = HTMLElement.prototype.getBoundingClientRect;
  beforeAll(() => {
    (window as any).PointerEvent = PointerEventPolyfill;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) { return rectFor(this); };
  });
  afterAll(() => {
    HTMLElement.prototype.getBoundingClientRect = originalRect;
  });

  it('把第一个字段拖到第二个之下 → 顺序交换并回传', async () => {
    const onFieldsChange = jest.fn();
    render(
      <ResumeFieldPanel
        cycleId={1}
        fields={FIELDS}
        onSave={async () => {}}
        onFieldsChange={onFieldsChange}
        fieldTypeOptions={[{ value: 'text' as any, label: '文本' }]}
      />,
    );

    await screen.findAllByText('姓名');
    const handleEls = Array.from(document.querySelectorAll('.resume-field-panel__drag-handle')) as HTMLElement[];
    expect(handleEls.length).toBe(2);

    const pointer = (type: string, target: Element | Document, y: number) =>
      fireEvent(target, new (window as any).PointerEvent(type, {
        bubbles: true, cancelable: true, button: 0, buttons: 1, isPrimary: true, pointerId: 1, clientX: 10, clientY: y,
      }));

    await act(async () => { pointer('pointerdown', handleEls[0], 10); });
    // 越过 8px 激活阈值，再落到第二张卡的中心（100~180）
    await act(async () => { pointer('pointermove', document, 30); });
    await act(async () => { pointer('pointermove', document, 150); });
    await act(async () => { pointer('pointerup', document, 150); });

    expect(onFieldsChange).toHaveBeenCalled();
    const next = onFieldsChange.mock.calls[onFieldsChange.mock.calls.length - 1][0];
    expect(next.map((f: any) => f.fieldKey)).toEqual(['student_id', 'name']);
    expect(next.map((f: any) => f.sortOrder)).toEqual([1, 2]);
  });
});
