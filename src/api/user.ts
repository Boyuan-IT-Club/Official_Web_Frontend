export type Id = string | number;

export interface UserInfo {
  userId: Id;
  name?: string;
  username?: string;
  major?: string;
  dept?: string;
  email?: string;
  phone?: string;
  /** 后端 user.github 列；页面「我的资料」在读它，类型里漏了会报 TS2339 */
  github?: string;
  avatar?: string;
}

export interface Award {
  awardId: Id;
  awardName: string;
  awardTime: string;
  description?: string;
}

export type AwardFormValues = {
  awardId?: Id;
  awardName: string;
  awardTime: string;
  description?: string;
};

export type UpdateAwardPayload = AwardFormValues & { awardId: Id };
export type AddAwardPayload = Omit<AwardFormValues, 'awardId'>;