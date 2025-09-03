//axios的封装处理
import axios from 'axios';
import { getToken, removeToken } from './token';

const request = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'https://official.boyuan.club',
    timeout: 10000,
    // 移除默认的Content-Type设置，让axios根据数据类型自动设置
})

//添加请求拦截器
request.interceptors.request.use(
    (config) => {
        // 在发送请求之前做些什么
        const token = getToken();
        if (token) {
            console.log("Token found:", token);
            config.headers['Authorization'] = `Bearer ${token}`; // 添加token到请求头
        }
        
        // 如果是FormData，让浏览器自动设置Content-Type（包括boundary）
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type']; // 删除可能存在的Content-Type设置
        }
        
        return config;
    },
    (error) => {
        // 对请求错误做些什么
        return Promise.reject(error);
    }
);

//添加响应拦截器
request.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        console.dir(error);
        if(error.response.statues === 401){
            removeToken();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);


export { request };