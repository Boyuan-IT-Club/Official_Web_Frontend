// 默认字段模板的不变量。
//
// 2026-09 清理背景：模板里「个人简介」与「自我介绍」重复被删；
// 但「期望部门」看着也像冗余，实际是面试意向同步的存储位、
// 「第一面试时间」是能否线下(canAttend)的存储位——删了链路会断。
// 这组断言让下一次"清理冗余字段"时必须先来这里读清楚。
import {
  DEFAULT_RESUME_FIELDS,
  DEPRECATED_RESUME_FIELD_KEYS,
  SYSTEM_RESUME_FIELD_KEYS,
} from './resumeEntry';

const templateKeys = DEFAULT_RESUME_FIELDS.map((f) => f.fieldKey);

describe('默认字段模板不变量', () => {
  it('「个人简介」已从模板移除且列入废弃（与自我介绍重复）', () => {
    expect(templateKeys).not.toContain('introduction');
    expect(DEPRECATED_RESUME_FIELD_KEYS).toContain('introduction');
  });

  it('系统存储字段必须保留在模板里——新周期初始化少了它们，志愿同步/线上线下登记会断', () => {
    SYSTEM_RESUME_FIELD_KEYS.forEach((k) => expect(templateKeys).toContain(k));
    // expected_interview_time 承载 canAttend/customTime（面试意向卡与待约线上名单读它）
    expect(templateKeys).toContain('expected_interview_time');
  });

  it('模板内 fieldKey 唯一', () => {
    expect(new Set(templateKeys).size).toBe(templateKeys.length);
  });

  it('自我介绍与加入理由仍在（删的是重复项，不是整个个人陈述分区）', () => {
    expect(templateKeys).toContain('self_introduction');
    expect(templateKeys).toContain('reason');
  });
});
