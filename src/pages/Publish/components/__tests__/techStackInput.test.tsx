import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TechStackInput from '../TechStackInput';

describe('技术栈输入', () => {
  it('传入空数组时仍渲染一行，还能继续加行', () => {
    /*
     * 用户报的 bug：留着几个空行提交简历，保存时空行被过滤掉存成 []，
     * 再进来编辑就一行都不画——而「加一行」的按钮挂在最后一行上，
     * 没有行就没有按钮，整栏彻底动不了。
     */
    const onChange = jest.fn();
    const onAdd = jest.fn();
    render(<TechStackInput items={[]} onChange={onChange} onAdd={onAdd} onRemove={jest.fn()} />);

    const input = screen.getByPlaceholderText('请输入技术栈');
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Java' } });
    expect(onChange).toHaveBeenCalledWith(0, 'Java');

    // 只有一行时不给删除按钮，但加行按钮必须在
    const buttons = document.querySelectorAll('.tech-stack-item button');
    expect(buttons.length).toBe(1);
    fireEvent.click(buttons[0] as Element);
    expect(onAdd).toHaveBeenCalled();
  });

  it('多行时每行都能删，最后一行带加行按钮', () => {
    const onRemove = jest.fn();
    render(<TechStackInput items={['Java', 'Go']} onChange={jest.fn()} onAdd={jest.fn()} onRemove={onRemove} />);
    expect(screen.getAllByPlaceholderText('请输入技术栈').length).toBe(2);
    const firstRowButtons = document.querySelectorAll('.tech-stack-item')[0].querySelectorAll('button');
    fireEvent.click(firstRowButtons[0]);
    expect(onRemove).toHaveBeenCalledWith(0);
  });
});
