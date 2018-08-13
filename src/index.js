(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (factory());
}(this, (function () { 'use strict';

    function evalCode(str) {
        try {
            var debugJson = {
                type: 'qqasync',
                UA: window.navigator.userAgent,
                referer: document.referrer,
                requestURL: window.location.href,
                nowTime: new Date().getTime(),
            };
            var reportURL = 'http://cgi.vip.qq.com/logger/index?cmd=debug&info=' +
                encodeURIComponent(JSON.stringify(debugJson) + str);
            var img = new Image();
            img.src = reportURL;
        } catch (e) {}
    }

    function logger(str) {
        try {
            var debugJson = {
                type: 'qqasync',
                UA: window.navigator.userAgent,
                referer: document.referrer,
                requestURL: window.location.href,
                nowTime: new Date().getTime(),
            };
            var reportURL = 'http://cgi.vip.qq.com/logger/index?cmd=debug&info=' +
                encodeURIComponent(JSON.stringify(debugJson) + str);
            var img = new Image();
            img.src = reportURL;
        } catch (e) {}
    }

    var storage = {
            _maxRetry: 1,
            _retry: true,
            get: function(key, parse) {
                var val;
                try {
                    val = localStorage.getItem(key);
                } catch (e) {
                    return undefined
                }
                if (val) {
                    return parse ? JSON.parse(val) : val
                } else {
                    return undefined
                }
            },
            set: function(key, val, retry) {
                retry = (typeof retry == 'undefined') ? this._retry : retry;
                try {
                    localStorage.setItem(key, val);
                } catch (e) {
                    if (retry) {
                        var max = this._maxRetry;
                        while (max > 0) {
                            max--;
                            this.removeAll();
                            this.set(key, val, false);
                        }
                    }
                }
            },
            remove: function(url) {
                try {
                    localStorage.removeItem(url);
                } catch (e) {}
            },
            removeAll: function(force) {
                var prefix = (data.localcache && data.localcache.prefix) || /^https?\:/;
                for (var i = localStorage.length - 1; i >= 0; i--) {
                    var key = localStorage.key(i);
                    if (!prefix.test(key)) continue //Notice: change the search pattern if not match with your manifest style
                    if (force || (remoteManifest && !remoteManifest[key])) {
                        localStorage.removeItem(key);
                    }
                }
            }
        };

    function compass(time) {
        var url = location.host + location.pathname;
        var ua = navigator.userAgent;
        var iosReg = /\b(iPad|iPhone|iPod)\b.*? OS ([\d_]+)/;
        var androidReg = /\bAndroid([^;]+)/;
        var iOS = iosReg.test(ua);
        var iAndroid = androidReg.test(ua);
        var os = 1;
        if (iOS) {
            os = 1;
        } else if (iAndroid) {
            os = 2;
        } else {
            os = 3;
        }
        var reportURL = 'http://pf.vip.qq.com/common/oz.php?ver=3&dcid=pf00045&actid=521600&dim1=' + url + '&dim2=' + time + '&dim3=' + os + '&labels=19,22&ext=&msg=&club=0&t=' + (new Date()).getTime();

        setTimeout(function() {
            var img = new Image();
            img.src = reportURL;
        }, 1000);
    }

    function emitCallback(data) {
        var callbacks = data.callbackList;
        var ca;
        while (ca = callbacks.shift()) {
            ca.apply(global, arguments);
        }
    }



    function changeFilesStatus(data,url, responseText, loadedOrder) {
            data['fecthedList'][url] = {
                loaded: true,
                executed: false,
                loadedOrder: loadedOrder,
                code: responseText
            };
        }

        function getUrlwithoutPara(url) {
            return url && url.split("?")[0];
        }

        function syncExec(data,fileList) {
            var file;
            while ((file = fileList.shift())) {
                if (data['fecthedList'] && data['fecthedList'][file]) {
                    var tmpFile = data['fecthedList'][file];
                    //文件已下载&&未执行
                    if (tmpFile['loaded'] && !tmpFile['executed']) {
                        evalCode(file, tmpFile['code']);
                        //执行完修改状态
                        tmpFile['executed'] = true;
                    }
                }
            }
            //全部执行完，执行回调
            if (!file) {
                emitCallback(data);
            }
        }



        function asyncExec(data){
            //每一次运行，最多执行一个文件
            var loadingFiles = data['fecthedList']; //debugger;
            for (var i = 0, len = fileList.length; i < len; i++) {
                var currentFile = fileList[i];
                //当前文件存在，已下载完成，并且未执行
                if (loadingFiles[currentFile] && loadingFiles[currentFile]['loaded'] && !loadingFiles[currentFile]['executed']) {
                    //当前文件前面的文件是否已经下载完且已执行标识
                    var ready = true;
                    //逆推如果前面的某一个没有loaded，或者 executed，则当前文件不执行，继续等待
                    for (var j = i - 1; j >= 0; j--) {
                        var previousFile = fileList[j];
                        //如果两个文件相同，不作比较，否则当前文件永远不执行
                        if (previousFile === currentFile) {
                            break;
                        }
                        if (loadingFiles[previousFile] && loadingFiles[previousFile]['loaded'] && loadingFiles[previousFile]['executed']) ; else {
                            ready = false;
                            break;
                        }
                    }
                    //如果当前文件满足可执行条件，执行文件，修改文件状态，删除此文件，并退出
                    if (ready) {
                        evalCode(currentFile, loadingFiles[currentFile]['code']);
                        executedTime++;
                        loadingFiles[currentFile]['executed'] = true;
                        fileList.splice(i, 1); //第i个执行完，就删除之，下次循环可以少判断一次
                        //如果执行次数和总文件个数一致，则已执行完所有文件，可以执行回调
                        if (executedTime === fileCount) {
                            emitCallback(data);
                        }
                        break;
                    }
                }
            }
        }

    //ajax 拉取数据

    var requestInfo = {};
    function fetchAjax(url, data) {
        var xhr = new global.XMLHttpRequest();
        var timer = setTimeout(function() {
            xhr.abort();
            
        }, 30000);
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                clearTimeout(timer);
                if (xhr.status === 200) {
                    loadedOrder++;
                    //文件下载后，先保存，并初始化文件的下载和执行状态（包括下载顺序）
                    changeFilesStatus(url, xhr.responseText, loadedOrder);
                    console && console.log(url + " loaded successfully");
                    //每次下载完，试图执行一次，保证如果可执行则立即执行之
                    asyncExec();
                    //如果下载次数和总文件个数一致，说明所有文件请求完成，判断未执行文件个数
                    if (fileCount === loadedOrder) {
                        //没有被执行的文件个数，执行之
                        var needexected = fileCount - executedTime;
                        while (needexected > 0) {
                            asyncExec();
                            needexected--;
                        }
                    }
                    //如果开启了缓存，还有内容来自请求，要么是第一次，要么有版本号修改，重新缓存请求的内容
                    if (data.localcache) {
                        storage.set(getUrlwithoutPara(url), xhr.responseText);
                    }
                    if (!requestInfo[url]) {
                        compass(1);
                    } else {
                        compass(2);
                    }
                } else {
                    //失败重试一次，且上报错误
                    logger(url + "ajax request fail!");
                    if (!requestInfo[url]) {
                        compass(3);
                        fetchAjax(url, callback);
                        requestInfo[url] = "1";
                    } else {
                        compass(4);
                    }
                }
            }
        };
        xhr.send(null);
    }
    //注释13：03

    var qqasync =  {
            version: "1.0.1"
        };
        var data$1 = qqasync.data = {};
        data$1.base = location.host + location.pathname + "_qqasync_mainfest";
        //初始化传入的文件列表
        var fileList$1 = [];
        //文件的执行状态
        data$1.fecthedList = {}; 
        //所有文件加载完后执行的回调
        data$1.callbackList = [];
        //是否开启localStorage缓存
        data$1.localcache = false;
        //是否文件内容全部来自缓存（如果全部来自缓存，同步执行）
        var isAllfromCache = true; 
        //初始化传入的文件个数
        var fileCount$1 = 0;
        //入口文件
        qqasync.use = function(configData) {
            for (var key in configData) {
                var curr = configData[key];
                if (key === "files") {
                    fileList$1 = curr;
                } else if (key === "callback") {
                    data$1.callbackList = [curr];
                } else if (key === "localcache") {
                    data$1.localcache = curr;
                }
            }
            request();
        };
        function request(){
            fileCount$1 = fileList$1.length;
            if (!fileCount$1) {
                console && console.log("files can not be empty!");
                return;
            }
            //哪怕开启了localStorage，只要不支持localStorage，当未开启处理
            if (data$1.localcache){
                if(!global.localStorage){
                    data$1.localcache = false;
                }else{
                    var manifest = parseMap();
                    if (!storage.get(data$1.base)) {
                        //如果开启缓存，设置主key，value为初始化传入的文件对象
                        storage.set(data$1.base, JSON.stringify(manifest));
                    }
                }
            } 
            //并行发请求(所有文件)
            setRequest();
            //如果开启缓存并且有内容来自非缓存，则可能新增文件或者url有变化（包括修改版本号），重新设置版本号管理（url每个页面一个保证能重新设置）
            if (data$1.localcache) {
                console && console.log("all request from cache: " + isAllfromCache);
                if (!isAllfromCache) {
                    storage.set(data$1.base, JSON.stringify(manifest));
                } else {
                    //如果内容全部来自缓存，同步执行下载的文件（异步内容的执行在回调中）
                    syncExec(data$1,fileList$1);
                }
            }
            return global;
        }
        function setRequest() {
            var files = data$1.files;
            var i = 0,len = files.length;
            while (i < len) {
                if (data$1.localcache) {
                    //如果存在key（url存在且版本号未变化）
                    var urlKeyValue = storage.get(data$1.urlKey);
                    //如果key有数据
                    if (urlKeyValue && urlKeyValue.indexOf(files[i]) != -1) {
                        //如果单个url作为key有数据
                        if (storage.get(files[i])) {
                            changeFilesStatus(data$1,files[i], storage.get(files[i]));
                        } else {
                            isAllfromCache = false;
                            fetchAjax(files[i],data$1);
                        }
                    //cache没有数据
                    } else {//debugger;
                        isAllfromCache = false;
                        fetchAjax(files[i],data$1);
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
                    fetchAjax(files[i],data$1);
                }
                i++;
            }
            return true;
        }

})));
