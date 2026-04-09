export type Id = string | number;

export interface UserInfo {
  userId: Id;
  name?: string;
  username?: string;
  major?: string;
  dept?: string;
  email?: string;
  phone?: string;
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