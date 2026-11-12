import React from "react";
import { Select } from "antd";
import { ALT_QUESTIONS_MAX, normalizeAltQuestions } from "./altQuestions";

/**
 * FAQ 的「附加问法」:同一个答案的其他问法,每种问法都参与检索。
 * 表单里存的就是要发给接口的值(整理过的字符串数组),所以保存逻辑不用再处理它。
 */
const AltQuestionsInput: React.FC<{
  /** Form.Item 注入 */
  id?: string;
  value?: string[];
  onChange?: (value: string[]) => void;
}> = ({ id, value, onChange }) => {
  const current = normalizeAltQuestions(value);
  return (
    <Select
      id={id}
      mode="tags"
      // 只当输入框用:问法是整句话,没有可供挑选的候选项
      open={false}
      suffixIcon={null}
      tokenSeparators={["\n"]}
      placeholder="输入一种问法后回车,如:入社要交钱吗"
      value={current}
      onChange={(next: string[]) => onChange?.(normalizeAltQuestions(next))}
      maxTagTextLength={40}
      notFoundContent={null}
      style={{ width: "100%" }}
      status={current.length >= ALT_QUESTIONS_MAX ? "warning" : undefined}
    />
  );
};

export default AltQuestionsInput;
