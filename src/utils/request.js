//axios的封装处理
import axios from 'axios';
import { getToken } from './token';
//1.根域名配置
//2.超时时间
//3.请求拦截器
//4.响应拦截器
const request=axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://43.143.27.198:8080',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
})

//添加请求拦截器
request.interceptors.request.use(
    (config)=> {
        // 在发送请求之前做些什么
        const token=getToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`; // 添加token到请求头
        }
        return config;
    },
    (error) => {
        // 对请求错误做些什么
        return Promise.reject(error);
    }
);

//添加响应拦截器
request.interceptors.response.use((response)=>{return response.data},(error)=>{
return Promise.reject(error);
})
export { request }