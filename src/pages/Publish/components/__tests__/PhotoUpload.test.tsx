// 个人照片配成必填时，必须真的拦得住。
//
// 线上事故：PhotoUpload 声明了 required 这个 prop，却从头到尾没用过 ——
// 红星没画、规则也没加，于是有同学没传照片就把简历投出来了。
// 照片的值走 redux 不进 antd Form，所以不能用 rules:[{required:true}]
// （那样传了照片也永远通不过），得用读 photoBase64 的校验器。
import React from 'react';
import { Form } from 'antd';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PhotoUpload from '../PhotoUpload';

/** 把组件放进一个真的 Form 里，点提交触发 validateFields —— 和线上同一条路径 */
const Harness: React.FC<{ photo?: string; required?: boolean; onOk: () => void }> = ({
  photo = '', required = true, onOk,
}) => {
  const [form] = Form.useForm();
  return (
    <Form form={form}>
      <PhotoUpload photoBase64={photo} onUpload={() => true} required={required} />
      <button
        type="button"
        data-testid="submit"
        onClick={() => { form.validateFields().then(onOk).catch(() => { /* 校验失败 */ }); }}
      >
        提交
      </button>
    </Form>
  );
};

describe('个人照片必填校验', () => {
  it('必填但没传照片：校验不通过，提交被拦下', async () => {
    const onOk = jest.fn();
    render(<Harness photo="" required onOk={onOk} />);

    fireEvent.click(screen.getByTestId('submit'));

    await waitFor(() => expect(screen.getByText('请上传个人照片')).toBeInTheDocument());
    expect(onOk).not.toHaveBeenCalled();
  });

  it('传了照片：照常通过 —— 照片值不进 Form，不能靠 rules.required 判', async () => {
    const onOk = jest.fn();
    render(<Harness photo="data:image/jpeg;base64,AAAA" required onOk={onOk} />);

    fireEvent.click(screen.getByTestId('submit'));

    await waitFor(() => expect(onOk).toHaveBeenCalled());
    expect(screen.queryByText('请上传个人照片')).not.toBeInTheDocument();
  });

  it('本届没把照片配成必填：不传也放行', async () => {
    const onOk = jest.fn();
    render(<Harness photo="" required={false} onOk={onOk} />);

    fireEvent.click(screen.getByTestId('submit'));

    await waitFor(() => expect(onOk).toHaveBeenCalled());
    expect(screen.queryByText('请上传个人照片')).not.toBeInTheDocument();
  });
});
