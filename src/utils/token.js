//封装和token的相关方法 存 取 删
 const TOKEKEY='token_key';
 function setToken(token){
    localStorage.setItem(TOKEKEY,token);
 }
    function getToken(){
        return localStorage.getItem(TOKEKEY);
    }
    function removeToken(){
        localStorage.removeItem(TOKEKEY);
    }
    export {setToken,getToken,removeToken};