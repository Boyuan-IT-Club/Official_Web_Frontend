//封装和token的相关方法 存 取 删
 const TOKENKEY='token';
 function setToken(token){
    localStorage.setItem(TOKENKEY,token);
 }
    function getToken(){
     try{ 

        console.log("Token value:", localStorage.getItem(TOKENKEY));
        return localStorage.getItem(TOKENKEY);} 
     catch (error)
      {
        console.error('Failed to get token from localStorage:', error);
        return null;
    }}
    function removeToken(){
        localStorage.removeItem(TOKENKEY);
    }
    export {setToken,getToken,removeToken};