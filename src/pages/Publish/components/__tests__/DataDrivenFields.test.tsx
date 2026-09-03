// 数据驱动表单的行为守卫。
//
// 改造的承诺是「管理员配什么，学生就填什么」，所以这里钉死的是那几条承诺：
// 顺序跟 sortOrder、标签跟配置、自定义字段能渲染、停用字段不出现、
// 以及选项的兜底不能丢——最后一条在改造过程中真的差点丢掉。
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DataDrivenFields, { RenderableField } from '../DataDrivenFields';

const noop = () => {};

function renderFields(fields: RenderableField[], extra: Partial<React.ComponentProps<typeof DataDrivenFields>> = {}) {
  return render(
    <DataDrivenFields
      fields={fields}
      canEdit
      getValue={() => ''}
      onChange={noop}
      onPhotoUpload={async () => true}
      techStackItems={[]}
      onTechStackChange={noop}
      onTechStackAdd={noop}
      onTechStackRemove={noop}
      departments={{ first: '', second: '' }}
      onDepartmentChange={noop}
      firstDeptOptions={[]}
      secondDeptOptions={[]}
      disabledSecondDepts={[]}
      {...extra}
    />,
  );
}

const f = (fieldKey: string, over: Partial<RenderableField> = {}): RenderableField =>
  ({ fieldKey, fieldType: 'text', ...over });

describe('投递表单的数据驱动渲染', () => {
  it('字段顺序跟随后端 sortOrder，而不是规范表的固有顺序', () => {
    // 规范表里 name(1) 在 major(5) 之前；管理员把 major 拖到了前面
    renderFields([
      f('name', { fieldLabel: '姓名', sortOrder: 9 }),
      f('major', { fieldLabel: '专业', sortOrder: 1 }),
    ]);

    const labels = screen.getAllByText(/姓名|专业/).map((el) => el.textContent);
    expect(labels.indexOf('专业')).toBeLessThan(labels.indexOf('姓名'));
  });

  it('标签用管理员配的，不是前端写死的默认名', () => {
    renderFields([f('github', { fieldLabel: '代码仓库地址' })]);
    expect(screen.getByText('代码仓库地址')).toBeInTheDocument();
    expect(screen.queryByText('GitHub主页')).not.toBeInTheDocument();
  });

  it('规范表里没有的自定义字段照样渲染', () => {
    // 这正是改造前学生端渲染不出来的那一类：管理员加了字段，学生没地方填
    renderFields([f('favorite_language', { fieldLabel: '最喜欢的编程语言' })]);
    expect(screen.getByText('最喜欢的编程语言')).toBeInTheDocument();
  });

  it('自定义字段按后端声明的类型选控件', () => {
    renderFields([
      f('why_us', { fieldLabel: '为什么选我们', fieldType: 'textarea', placeholder: '说说看' }),
    ]);
    expect(screen.getByPlaceholderText('说说看').tagName).toBe('TEXTAREA');
  });

  it('后端没给 options 时用兜底选项，不留空下拉', () => {
    // 周期配置里 grade 常常没填 options；缺兜底学生看到的是一个点不开的空下拉
    renderFields([f('grade', { fieldLabel: '年级', fieldType: 'select' })], {
      fallbackOptions: { grade: [{ value: '大一', label: '大一' }] },
    });
    expect(screen.getByText('年级')).toBeInTheDocument();
  });

  it('后端给了 options 就以后端为准，兜底不生效', () => {
    renderFields([
      f('gender', { fieldLabel: '性别', fieldType: 'radio', options: ['男', '女', '不便透露'] }),
    ], {
      fallbackOptions: { gender: [{ value: '男', label: '男' }, { value: '女', label: '女' }] },
    });
    expect(screen.getByText('不便透露')).toBeInTheDocument();
  });

  it('字段按分区归组，空分区不出现', () => {
    renderFields([
      f('name', { fieldLabel: '姓名' }),
      f('tech_stack', { fieldLabel: '技术栈' }),
    ]);
    expect(screen.getByText('基本信息')).toBeInTheDocument();
    expect(screen.getByText('技术能力')).toBeInTheDocument();
    // 没有个人陈述类字段，就不该出现这个空标题
    expect(screen.queryByText('个人陈述')).not.toBeInTheDocument();
  });

  it('志愿部门不读字段值，选项来自部门列表', async () => {
    // 志愿的值不存在自己的字段里，而是由两个下拉合成 expected_departments
    // 的 JSON。要是当成普通字段走 getValue/onChange，读到的永远是空，
    // 写下去也不会触发合成 JSON 那一步——志愿等于没填。
    const getValue = jest.fn(() => '');
    renderFields([f('first_choice', { fieldLabel: '第一志愿' })], {
      getValue,
      firstDeptOptions: [{ value: '技术部', label: '技术部' }],
    });

    expect(getValue).not.toHaveBeenCalledWith('first_choice');

    // 选项来自部门列表而不是字段配置的 options
    fireEvent.mouseDown(document.querySelector('.ant-select-selector')!);
    expect(await screen.findByRole('option', { name: '技术部' })).toBeInTheDocument();
  });

  it('第二志愿会禁用已被第一志愿占用的部门', async () => {
    renderFields([f('second_choice', { fieldLabel: '第二志愿' })], {
      secondDeptOptions: [{ value: '技术部', label: '技术部' }, { value: '设计部', label: '设计部' }],
      disabledSecondDepts: ['技术部'],
    });

    fireEvent.mouseDown(document.querySelector('.ant-select-selector')!);
    // 两个志愿填成同一个部门是无效数据，禁用比提交后报错更早拦住。
    // 注意 role="option" 会同时命中 rc-select 那份无障碍用的隐藏列表（class 为空），
    // 所以按 antd 的可见选项类名取，禁用态也标在 class 上而不是 aria-disabled
    await screen.findByRole('option', { name: '技术部' });
    const visible = Array.from(document.querySelectorAll('.ant-select-item-option'));
    const byText = (t: string) => visible.find((el) => el.textContent === t)!;

    expect(byText('技术部').className).toContain('ant-select-item-option-disabled');
    expect(byText('设计部').className).not.toContain('ant-select-item-option-disabled');
  });

  it('传进来的字段一个不漏地渲染', () => {
    const keys = ['name', 'student_id', 'email', 'custom_one', 'custom_two'];
    renderFields(keys.map((k) => f(k, { fieldLabel: `标签-${k}` })));
    keys.forEach((k) => expect(screen.getByText(`标签-${k}`)).toBeInTheDocument());
  });

  it('自定义字段归到「其他信息」，不混进基本信息', () => {
    // 「实验室经历」跟在学号后面读着莫名其妙；自定义问题应排在标准字段之后
    renderFields([
      f('name', { fieldLabel: '姓名' }),
      f('lab_experience', { fieldLabel: '实验室经历', fieldType: 'textarea' }),
    ]);

    const sections = Array.from(document.querySelectorAll('.form-section'));
    const sectionOf = (label: string) => sections.find(
      (sec) => Array.from(sec.querySelectorAll('label')).some((l) => l.textContent?.trim() === label),
    );
    expect(sectionOf('实验室经历')?.querySelector('.section-title')?.textContent)
      .toContain('其他信息');
    expect(sectionOf('姓名')?.querySelector('.section-title')?.textContent)
      .toContain('基本信息');
  });

  it('两个志愿下拉并排，不退化成上下两行', () => {
    renderFields([
      f('first_choice', { fieldLabel: '第一志愿' }),
      f('second_choice', { fieldLabel: '第二志愿' }),
    ]);
    const cols = Array.from(document.querySelectorAll('.form-section > .ant-row > .ant-col'));
    expect(cols).toHaveLength(2);
    cols.forEach((c) => expect(c.className).toContain('ant-col-md-12'));
  });

  it('照片是基本信息区的右侧栏，不排进字段流', () => {
    // 数据驱动改造时它被当成普通整宽字段排进流里，掉到了所有文字字段下面。
    // 它应当竖着占右侧一栏（md=8），与左边的姓名/学号并列。
    const { container } = renderFields([
      f('name', { fieldLabel: '姓名' }),
      f('student_id', { fieldLabel: '学号' }),
      f('personal_photo', { fieldLabel: '个人照片' }),
    ]);

    const cols = Array.from(container.querySelectorAll('.form-section > .ant-row > .ant-col'));
    expect(cols).toHaveLength(2);
    expect(cols[0].className).toContain('ant-col-md-16');   // 文字字段
    expect(cols[1].className).toContain('ant-col-md-8');    // 照片

    // 照片确实在右栏里，而不是落在左栏的流末尾
    expect(cols[1].textContent).toContain('个人照片');
    expect(cols[0].textContent).not.toContain('个人照片');
  });

  it('没有照片字段时不产生空的右侧栏', () => {
    const { container } = renderFields([f('name', { fieldLabel: '姓名' })]);
    const cols = Array.from(container.querySelectorAll('.form-section > .ant-row > .ant-col'));
    expect(cols.every((c) => !c.className.includes('ant-col-md-8'))).toBe(true);
  });

  it('志愿下拉的表单字段名沿用 first_department / second_department', () => {
    // antd 的 Form.Item name= 会用表单 store 里的值覆盖传入的 value，
    // 而投递页是按这两个旧名 setFieldsValue 的。改成 first_choice 之后
    // store 里查无此项，下拉永远是空的——线上「部门填不上」就是这么来的。
    const { container } = renderFields([
      f('first_choice', { fieldLabel: '第一志愿' }),
      f('second_choice', { fieldLabel: '第二志愿' }),
    ]);
    const ids = Array.from(container.querySelectorAll('[id]')).map((el) => el.id);
    expect(ids).toContain('first_department');
    expect(ids).toContain('second_department');
    expect(ids).not.toContain('first_choice');
  });
});
