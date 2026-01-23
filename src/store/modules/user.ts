import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { request } from "@/utils";
import { setToken as _setToken, getToken, removeToken } from "@/utils";
import { message } from "antd";

/** ===== Types ===== */

type ThunkApiConfig = { rejectValue: string };

export interface LoginForm {
  account?: string;
  username?: string;
  email?: string;
  password: string;
  [key: string]: unknown;
}

export interface RegisterForm {
  username?: string;
  email?: string;
  password: string;
  [key: string]: unknown;
}

export interface ResetPasswordForm {
  email?: string;
  code?: string;
  newPassword?: string;
  [key: string]: unknown;
}

export interface UserInfo {
  userId?: string | number;
  name?: string;
  phone?: string;
  major?: string | null;
  avatar?: string;
  [key: string]: unknown;
}

export interface Award {
  awardId: string | number;
  awardName: string;
  awardTime: string; // "YYYY-MM-DD"
  description?: string;
  [key: string]: unknown;
}

export interface UserState {
  token: string;
  userInfo: UserInfo;
  awards: Award[];
  loading: boolean;
  error: string | null;
  avatarUploading: boolean;
}

/** ===== Thunks ===== */

// 登录
export const fetchLogin = createAsyncThunk<
  any, // 返回结构你目前只用到 token，先 any，后面可以细化成 { token: string }
  LoginForm,
  ThunkApiConfig
>("user/fetchLogin", async (loginForm, { rejectWithValue }) => {
  try {
    const res = await request.post("/api/auth/login", loginForm);
    return (res as any).data;
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message || error?.message || "登录失败",
    );
  }
});

// 注册
export const fetchRegister = createAsyncThunk<
  any,
  RegisterForm,
  ThunkApiConfig
>("user/fetchRegister", async (registerData, { rejectWithValue }) => {
  try {
    const res = await request.post("/api/auth/register", registerData);
    return (res as any).data;
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message || error?.message || "注册失败",
    );
  }
});

// 获取用户信息
export const fetchUserInfo = createAsyncThunk<UserInfo, void, ThunkApiConfig>(
  "user/fetchUserInfo",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const res = await request.get("/api/user/me");
      // 你原逻辑 return res.data.user :contentReference[oaicite:1]{index=1}
      return (res as any).data.user as UserInfo;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        dispatch(clearToken());
      }
      return rejectWithValue(
        error?.response?.data?.message || error?.message || "获取用户信息失败",
      );
    }
  },
);

// 重置密码
export const fetchResetPassword = createAsyncThunk<
  any,
  ResetPasswordForm,
  ThunkApiConfig
>("user/fetchResetPassword", async (resetData, { rejectWithValue }) => {
  try {
    const res = await request.post("/api/auth/reset-password", resetData);
    return (res as any).data;
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message || error?.message || "重置失败",
    );
  }
});

// 登出
export const logout = createAsyncThunk<boolean, void, ThunkApiConfig>(
  "user/logout",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      try {
        await request.post("/api/auth/logout");
      } catch {
        // eslint-disable-next-line no-console
        console.log("后端登出接口调用失败，继续清理前端状态");
      }
      removeToken();
      dispatch(clearToken());
      return true;
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("登出失败:", error);
      removeToken();
      dispatch(clearToken());
      return rejectWithValue(
        error?.response?.data?.message || error?.message || "登出失败",
      );
    }
  },
);

// 更新用户信息
export const updateUserInfo = createAsyncThunk<
  any,
  Partial<UserInfo>,
  ThunkApiConfig
>("user/updateUserInfo", async (userData, { rejectWithValue, dispatch }) => {
  try {
    const updateData: Pick<UserInfo, "name" | "phone" | "major"> = {
      name: userData.name,
      phone: userData.phone,
      major: userData.major ?? null,
    };

    Object.keys(updateData).forEach((key) => {
      const k = key as keyof typeof updateData;
      if (updateData[k] === undefined || updateData[k] === ("" as any)) {
        updateData[k] = null as any;
      }
    });

    const res = await request.put("/api/user/me", updateData);
    await dispatch(fetchUserInfo()).unwrap();
    return (res as any).data;
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message || error?.message || "更新失败",
    );
  }
});

// 上传头像
export const uploadAvatar = createAsyncThunk<string, File, ThunkApiConfig>(
  "user/uploadAvatar",
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      // eslint-disable-next-line no-console
      console.log("上传文件:", file.name, file.type, file.size);

      const res: any = await request.post("/api/user/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // eslint-disable-next-line no-console
      console.log("上传响应:", res);

      if (res.code === 200) {
        let avatarUrl: string | undefined =
          res.data?.fullHttpPath || res.data?.avatarUrl || res.data?.avatar;

        if (avatarUrl && !avatarUrl.startsWith("http")) {
          if (avatarUrl.startsWith("/")) {
            avatarUrl = `https://official.boyuan.club${avatarUrl}`;
          } else {
            avatarUrl = `https://official.boyuan.club/uploads/avatars/${avatarUrl}`;
          }
        }

        return avatarUrl || "";
      }

      throw new Error(res.message || "上传失败");
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("上传错误:", error);
      return rejectWithValue(
        error?.response?.data?.message || error?.message || "上传失败",
      );
    }
  },
);

// 获取获奖经历
export const fetchUserAwards = createAsyncThunk<
  Award[],
  string | number,
  ThunkApiConfig
>("user/fetchUserAwards", async (userId, { rejectWithValue }) => {
  try {
    const res: any = await request.get(`/api/awards/user/${userId}`);
    if (res.code === 200) return (res.data as Award[]) || [];
    throw new Error(res.message || "获取获奖经历失败");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message || error?.message || "获取失败",
    );
  }
});

// 辅助：格式化日期
function formatDateTime(dateString: string): string | null {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("日期格式化错误:", error);
    return null;
  }
}

// 添加获奖经历
export const addAward = createAsyncThunk<
  Award,
  { awardName: string; awardTime: string; description?: string },
  ThunkApiConfig
>("user/addAward", async (awardData, { rejectWithValue, getState }) => {
  try {
    const state = getState() as { user: UserState };
    const { userInfo } = state.user;

    const formattedData = {
      userId: userInfo.userId,
      awardName: awardData.awardName,
      awardTime: formatDateTime(awardData.awardTime) || "2024-12-01",
      description: awardData.description,
    };

    // eslint-disable-next-line no-console
    console.log("发送获奖数据:", formattedData);

    const res: any = await request.post("/api/awards", formattedData, {
      headers: { "Content-Type": "application/json" },
    });

    if (res.code === 200) {
      return {
        awardId: res.data.award_id,
        awardName: formattedData.awardName,
        awardTime: formattedData.awardTime,
        description: formattedData.description,
      };
    }

    throw new Error(res.message || "添加获奖经历失败");
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error("添加获奖经历完整错误:", error);
    // eslint-disable-next-line no-console
    console.error("错误响应:", error?.response?.data);
    // eslint-disable-next-line no-console
    console.error("错误状态:", error?.response?.status);

    let errorMessage = "操作失败，请重试";
    if (error?.response?.data) {
      const responseData = error.response.data;
      if (typeof responseData === "object") {
        errorMessage = responseData.message || JSON.stringify(responseData);
      } else {
        errorMessage = String(responseData);
      }
    } else if (error?.response?.status === 500) {
      errorMessage = "服务器内部错误，请联系管理员";
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return rejectWithValue(errorMessage);
  }
});

// 修改获奖经历
export const updateAward = createAsyncThunk<
  Award,
  {
    awardId: Award["awardId"];
    awardName: string;
    awardTime: string;
    description?: string;
  },
  ThunkApiConfig
>("user/updateAward", async (awardData, { rejectWithValue }) => {
  try {
    const formattedData = {
      awardId: awardData.awardId,
      awardName: awardData.awardName,
      awardTime: formatDateTime(awardData.awardTime) || awardData.awardTime,
      description: awardData.description,
    };

    // eslint-disable-next-line no-console
    console.log("更新获奖数据:", formattedData);

    const res: any = await request.put("/api/awards", formattedData);
    if (res.code === 200) {
      return {
        awardId: awardData.awardId,
        awardName: formattedData.awardName,
        awardTime: formattedData.awardTime,
        description: formattedData.description,
      };
    }
    throw new Error(res.message || "更新获奖经历失败");
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message || error?.message || "更新失败",
    );
  }
});

// 删除获奖经历
export const deleteAward = createAsyncThunk<
  Award["awardId"],
  Award["awardId"],
  ThunkApiConfig
>("user/deleteAward", async (awardId, { rejectWithValue }) => {
  try {
    await request.delete(`/api/awards/${awardId}`);
    return awardId;
  } catch (error: any) {
    return rejectWithValue(
      error?.response?.data?.message || error?.message || "删除失败",
    );
  }
});

/** ===== Slice ===== */

const initialState: UserState = {
  token: getToken() || "",
  userInfo: {},
  awards: [],
  loading: false,
  error: null,
  avatarUploading: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      _setToken(action.payload);
    },
    clearToken: (state) => {
      state.token = "";
      state.userInfo = {};
      state.awards = [];
      removeToken();
    },
    setUserInfo: (state, action: PayloadAction<UserInfo>) => {
      state.userInfo = action.payload;
    },
    resetError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 登录
      .addCase(fetchLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLogin.fulfilled, (state, action) => {
        state.loading = false;
        const token = (action.payload as any)?.token as string | undefined;
        if (token) {
          state.token = token;
          _setToken(token);
        }
      })
      .addCase(fetchLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "登录失败";
      })

      // 注册
      .addCase(fetchRegister.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRegister.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(fetchRegister.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "注册失败";
      })

      // 登出
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.token = "";
        state.userInfo = {};
        state.awards = [];
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.token = "";
        state.userInfo = {};
        state.awards = [];
        state.error = action.payload ?? "登出失败";
      })

      // 用户信息
      .addCase(fetchUserInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserInfo.fulfilled, (state, action) => {
        state.loading = false;

        const userInfo = (action.payload as any)?.user || action.payload;

        // 处理 avatar URL（保持你原逻辑 :contentReference[oaicite:2]{index=2}）
        if (userInfo?.avatar) {
          if (String(userInfo.avatar).startsWith("http")) {
            // do nothing
          } else if (String(userInfo.avatar).startsWith("/")) {
            userInfo.avatar = `https://official.boyuan.club${userInfo.avatar}`;
          } else {
            userInfo.avatar = `https://official.boyuan.club/uploads/avatars/${userInfo.avatar}`;
          }
        }

        state.userInfo = userInfo as UserInfo;
      })
      .addCase(fetchUserInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "获取用户信息失败";
      })

      // 重置密码
      .addCase(fetchResetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResetPassword.fulfilled, (state) => {
        state.loading = false;
        message.success("密码重置成功");
      })
      .addCase(fetchResetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "重置失败";
      })

      // 更新用户信息
      .addCase(updateUserInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserInfo.fulfilled, (state) => {
        state.loading = false;
        message.success("用户信息更新成功");
      })
      .addCase(updateUserInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "更新失败";
      })

      // 获奖经历列表
      .addCase(fetchUserAwards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserAwards.fulfilled, (state, action) => {
        state.loading = false;
        state.awards = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchUserAwards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "获取失败";
      })

      // 添加获奖经历
      .addCase(addAward.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addAward.fulfilled, (state, action) => {
        state.loading = false;
        state.awards.push(action.payload);
      })
      .addCase(addAward.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "添加失败";
      })

      // 修改获奖经历
      .addCase(updateAward.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAward.fulfilled, (state, action) => {
        state.loading = false;
        if (
          action.payload?.awardId !== undefined &&
          action.payload?.awardId !== null
        ) {
          const index = state.awards.findIndex(
            (a) => a.awardId === action.payload.awardId,
          );
          if (index !== -1) {
            state.awards[index] = { ...state.awards[index], ...action.payload };
          }
        }
      })
      .addCase(updateAward.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "更新失败";
      })

      // 删除获奖经历
      .addCase(deleteAward.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAward.fulfilled, (state, action) => {
        state.loading = false;
        state.awards = state.awards.filter((a) => a.awardId !== action.payload);
      })
      .addCase(deleteAward.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "删除失败";
      })

      // 头像上传
      .addCase(uploadAvatar.pending, (state) => {
        state.avatarUploading = true;
        state.error = null;
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.avatarUploading = false;
        state.userInfo = { ...state.userInfo, avatar: action.payload };
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.avatarUploading = false;
        state.error = action.payload ?? "上传失败";
      });
  },
});

export const { setToken, clearToken, setUserInfo, resetError } =
  userSlice.actions;

export const userActions = {
  fetchLogin,
  fetchRegister,
  fetchUserInfo,
  fetchUserAwards,
  fetchResetPassword,
  logout,
  updateUserInfo,
  uploadAvatar,
  addAward,
  updateAward,
  deleteAward,

  setToken,
  clearToken,
  setUserInfo,
  resetError,
};

export default userSlice.reducer;
