    import evalCode from './utils/eval';
    import logger from './utils/logger';
    import storage from './utils/localstorage';
    import fetchAjax from './utils/ajax';
    import {syncExec,asyncExec,changeFilesStatus,getUrlwithoutPara} from './utils/tools.js'


    var qqasync =  {
        version: "1.0.1"
    }
    var data = qqasync.data = {};
    data.base = location.host + location.pathname + "_qqasync_mainfest";
    //初始化传入的文件列表
    var fileList = [];
    //文件的执行状态
    data.fecthedList = {}; 
    //所有文件加载完后执行的回调
    data.callbackList = [];
    //是否开启localStorage缓存
    data.localcache = false;
    //是否文件内容全部来自缓存（如果全部来自缓存，同步执行）
    var isAllfromCache = true; 
    //初始化传入的文件个数
    var fileCount = 0;
    //被执行的文件个数
    var executedTime = 0;
    //被下载的文件个数（也是该文件下载的顺序）
    var loadedOrder = 0;
    //整体状态 0: 初始值 1：添加文件中 2：添加回调函数中 3：执行中
    var status = 0;
    //是否执行中
    var firing = false;
    //入口文件
    qqasync.use = function(configData) {
        for (var key in configData) {
            var curr = configData[key];
            if (key === "files") {
                fileList = curr;
            } else if (key === "callback") {
                data.callbackList = [curr];
            } else if (key === "localcache") {
                data.localcache = curr;
            }
        }
        request();
    }
    function request(){
        fileCount = fileList.length;
        if (!fileCount) {
            console && console.log("files can not be empty!")
            return;
        }
        //哪怕开启了localStorage，只要不支持localStorage，当未开启处理
        if (data.localcache){
            if(!global.localStorage){
                data.localcache = false;
            }else{
                var manifest = parseMap();
                if (!storage.get(data.base)) {
                    //如果开启缓存，设置主key，value为初始化传入的文件对象
                    storage.set(data.base, JSON.stringify(manifest));
                }
            }
        } 
        //并行发请求(所有文件)
        setRequest();
        //如果开启缓存并且有内容来自非缓存，则可能新增文件或者url有变化（包括修改版本号），重新设置版本号管理（url每个页面一个保证能重新设置）
        if (data.localcache) {
            console && console.log("all request from cache: " + isAllfromCache);
            if (!isAllfromCache) {
                storage.set(data.base, JSON.stringify(manifest));
            } else {
                //如果内容全部来自缓存，同步执行下载的文件（异步内容的执行在回调中）
                syncExec(data,fileList);
            }
        }
        return global;
    }
    function setRequest() {
        var files = data.files;
        var i = 0,len = files.length;
        while (i < len) {
            if (data.localcache) {
                //如果存在key（url存在且版本号未变化）
                var urlKeyValue = storage.get(data.urlKey);
                //如果key有数据
                if (urlKeyValue && urlKeyValue.indexOf(files[i]) != -1) {
                    //如果单个url作为key有数据
                    if (storage.get(files[i])) {
                        changeFilesStatus(data,files[i], storage.get(files[i]));
                    } else {
                        isAllfromCache = false;
                        fetchAjax(files[i],data);
                    }
                //cache没有数据
                } else {//debugger;
                    isAllfromCache = false;
                    fetchAjax(files[i],data);
                    //url修改参数，清除旧文件
                    var cleanurl = getUrlwithoutPara(files[i]);
                    if(urlKeyValue){
                        var urlKeyValueArr = JSON.parse(urlKeyValue);
                        for(var j in urlKeyValueArr){
                            if(urlKeyValueArr[j].indexOf(cleanurl) ==0){
                                storage.remove(urlKeyValueArr[j]);
                                break;
                            }
                        }
                    }
                }
            } else {
                isAllfromCache = false;
                fetchAjax(files[i],data);
            }
            i++;
        }
        return true;
    }


