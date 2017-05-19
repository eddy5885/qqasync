/**
 *
 * qqasync.js 1.0.0 | eddysxzhang 2016-08-05 | 异步加载JS
 *
 * 主要功能和测试点：
 * 1 异步加载（并行加载）
 * 2 按照传参顺序，顺序执行
 * 3 支持LocalStorage缓存
 * 3.1 开始缓存功能后，首次访问会存储js内容，第二次不再发请求，取本地缓存数据
 * 3.2 js有版本发布，修改js Url参数，达到清理缓存重新拉取文件功能，同时LocalStorage会重新保存该js的值
 * 3.3 同一站点下页面非常多，没有公共配置，localStorage的不同的页面js缓存共享，urlkey不共享
 * 4 文件请求失败会重新请求一次，第二次如果失败不会继续请求
 * 5 文件请求失败会上报监控日志，js eval失败也会上报错误日志
 * 6 js由ajax请求下载并存储，所以要求请求的js和主站点可跨域
 * 7 文件异步下载，不能保证下载顺序，但是要求有执行顺序，通过初始化的文件个数，下载个数和执行次数来完成
 * 7.1文件下载，下载+1，并执行，通过严格的条件判断是否可执行，如果执行，则执行+1
 * 7.2 文件下载完后，判断有多少下载的未执行，并执行
 * 8. 所有文件执行完后，执行传参的回调
 *
 * 主要解决问题
 * 1.异步并行加载，且顺序执行
 * 2.缓存js到localStorage，一次加载多次利用
 * 3.iOS同步加载时，底部js超时可能导致白屏Bug，异步加载则不会白屏
 *
 * 使用示例：
<script type="text/javascript">
 * 参数说明：
 * files 必填参数：传入数组类型，指定需要加载的js文件，按传入顺序执行
 * callback 可选参数：files全部执行完后，触发的回调函数
 * localcache 可选参数：默认为false不开启，传true则开启缓存
使用方式：
1. 配置即可
var requestStart = +new Date();
qqasync.use({
    files: ['http://imgcache.qq.com/club/platform/lib/qqasync/testjs/1.js',
     'http://imgcache.qq.com/club/platform/lib/qqasync/testjs/2.js', 
     'http://imgcache.qq.com/club/platform/lib/qqasync/testjs/3.js',
     'http://imgcache.qq.com/club/platform/lib/qqasync/testjs/4.js?v=1'],
    callback: function() {
        var requestEnd = +new Date();
        console.log(requestEnd - requestStart);
    },
    localcache:1
});

2. 静态方法 
var requestStart = +new Date();
qqasync.localcache()
    .add("http://imgcache.qq.com/club/platform/lib/qqasync/testjs/1.js")
    .add("http://imgcache.qq.com/club/platform/lib/qqasync/testjs/2.js")
    .add(["http://imgcache.qq.com/club/platform/lib/qqasync/testjs/3.js","http://imgcache.qq.com/club/platform/lib/qqasync/testjs/4.js"])
    .add(function(){
        var requestEnd = +new Date();
        console.log(requestEnd - requestStart);
    }).fire();

or:

var requestStart = +new Date();
qqasync.localcache();
qqasync.add("http://imgcache.qq.com/club/platform/lib/qqasync/testjs/1.js");
qqasync.add("http://imgcache.qq.com/club/platform/lib/qqasync/testjs/2.js");
qqasync.add(["http://imgcache.qq.com/club/platform/lib/qqasync/testjs/3.js", "http://imgcache.qq.com/club/platform/lib/qqasync/testjs/4.js"]);
qqasync.add(function() {
    var requestEnd = +new Date();
    console.log(requestEnd - requestStart);
});
qqasync.fire();
</script>
 */
(function(global, undefined) {

    if (global.qqasync) {
        return
    }
    var qqasync = global.qqasync = {
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
                syncExec();
            }
        }
        return global;
    }
    function isType(type) {
      return function(obj) {
        return {}.toString.call(obj) == "[object " + type + "]"
      }
    }
    var isArray = Array.isArray || isType("Array");
    var isFunction = isType("Function");
    var isString = isType("String")

    function inArray(elem, array) {
        var indexOf = Array.prototype.indexOf;
        if (array) {
            if (indexOf) {
                return indexOf.call(array, elem) !== -1;
            }
            for (var i = 0, len = array.length; i < len; i++) {
                if (array[i] === elem) {
                    return true;
                }
            }
        }
        return false;
    }
    qqasync.add = function() {
        var args = arguments[0];
        if (!firing) {
            if (isFunction(args)) {
                data.callbackList.push(args);
            } else {
                if (isString(args)) {
                    if (!inArray(args, fileList)) {
                        fileList.push(args);
                    }
                } else if (isArray(args)) {
                    for (var i = 0, len = args.length; i < len; i++) {
                        if (!inArray(args[i], fileList)) {
                            fileList.push(args[i]);
                        }
                    }
                }

            }
        }
        return qqasync;
    }
    qqasync.fire = function() {
        if (!firing) {
            request.apply(global, arguments);
            firing = true;
        }
        return qqasync;
    }
    qqasync.localcache = function(){
        if(!firing){
            data.localcache = true;
        }
        return qqasync;
    }
    function parseMap(){
        var manifest = {};
        for (var i = 0; i < fileCount; i++) {
            var keyname = getUrlwithoutParam(fileList[i]);
            var keyValue = fileList[i].replace(keyname, "");
            manifest[keyname] = keyValue;
        }
        return manifest;
    }
    function setRequest() {
        for (var i = 0; i < fileCount; i++) {
            //debugger;
            if (data.localcache) {
                //如果存在urlKey
                var urlKeyValue = storage.get(data.base);
                if (urlKeyValue) {
                    //如果key有数据，且版本号一致
                    var urlKeyValueOBJ = JSON.parse(urlKeyValue);
                    var urlwithoutPara = getUrlwithoutParam(fileList[i]);
                    //如果localStorage中版本号 和 url中版本号一致，则在localStorage中取数据，否则发请求取数据（同时修改状态，后面会更新localStorage中版本号）
                    if ((typeof urlKeyValueOBJ[urlwithoutPara] !== "undefined") && urlKeyValueOBJ[urlwithoutPara] === getUrlVersion(fileList[i])) {
                        if (storage.get(urlwithoutPara)) {
                            loadedOrder++;
                            changeFilesStatus(fileList[i], storage.get(urlwithoutPara), loadedOrder);
                            compass(5);
                        } else {
                            isAllfromCache = false;
                            fetchAjax(fileList[i]);
                        }
                    } else {
                        isAllfromCache = false;
                        fetchAjax(fileList[i]);
                    }
                }
            } else {
                isAllfromCache = false;
                fetchAjax(fileList[i]);
            }
        }
    }

    function getUrlwithoutParam(url) {
        return url && url.split("?")[0];
    }
    function getUrlVersion(url){
        return url && url.replace(getUrlwithoutParam(url),"");
    }
    function asyncExec(){
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
                    if (loadingFiles[previousFile] && loadingFiles[previousFile]['loaded'] && loadingFiles[previousFile]['executed']) {} else {
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
                        emitCallback();
                    }
                    break;
                }
            }
        }
    }
    function emitCallback(){
        var callbacks = data.callbackList;
        var ca;
        while(ca = callbacks.shift()){
            ca.apply(global,arguments);
        }
    }
    //同步按照加载的文件顺序执行
    function syncExec() {
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
            emitCallback();
        }
    }
    var requestInfo = {};

    function fetchAjax(url, callback) {
        var xhr = new global.XMLHttpRequest()
        var timer = setTimeout(function() {
            xhr.abort()
            callback && callback(null)
        }, 30000);
        xhr.open('GET', url, true)
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                clearTimeout(timer)
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
                            needexected--
                        }
                    }
                    //如果开启了缓存，还有内容来自请求，要么是第一次，要么有版本号修改，重新缓存请求的内容
                    if (data.localcache) {
                        storage.set(getUrlwithoutParam(url), xhr.responseText); 
                    }
                    if(!requestInfo[url]){
                        compass(1);
                    }else{
                        compass(2);
                    }
                } else {
                    callback && callback(null);
                    //失败重试一次，且上报错误
                    logger(url + "ajax request fail!");
                    if (!requestInfo[url]) {
                        compass(3);
                        fetchAjax(url, callback);
                        requestInfo[url] = "1";
                    }else{
                        compass(4);
                    }
                }
            }
        }
        xhr.send(null)
    }
    function changeFilesStatus(url, responseText, loadedOrder) {
        data['fecthedList'][url] = {
            loaded: true,
            executed: false,
            loadedOrder: loadedOrder,
            code: responseText
        }
    }
    function evalCode(url, code) {
        if (code && /\S/.test(code)) {
            try {
                code += '//@ sourceURL=' + url //for chrome debug
                ;
                (global.execScript || function(data) {
                    global['eval'].call(global, data)
                })(code)
                console && console.log(url +" eval successfully")
            } catch (e) {
                //失败上报错误
                logger(url + " eval fail;" + e);
                return false
            }
        }
        return true
    }
    function logger(str) {return;
        try {
            var debugJson = {
                    type:'qqasync',
                    UA: global.navigator.userAgent,
                    referer: document.referrer,
                    requestURL: global.location.href,
                    nowTime: new Date().getTime(),
                };
            var reportURL = 'http://cgi.vip.qq.com/logger/index?cmd=debug&info=' + encodeURIComponent(JSON.stringify(debugJson) + str);
            var img = new Image();
            img.src = reportURL;
        } catch (e) {}
    }
    function compass(time) {
        var url = location.host + location.pathname;
        var ua = navigator.userAgent
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
    var storage = {
        _maxRetry: 1,
        _retry: true,
        get: function(key, parse) {
            var val
            try {
                val = localStorage.getItem(key)
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
            retry = (typeof retry == 'undefined') ? this._retry : retry
            try {
                localStorage.setItem(key, val)
            } catch (e) {
                if (retry) {
                    var max = this._maxRetry
                    while (max > 0) {
                        max--
                        this.removeAll()
                        this.set(key, val, false)
                    }
                }
            }
        },
        remove: function(url) {
            try {
                localStorage.removeItem(url)
            } catch (e) {}
        },
        removeAll: function(force) {
            var prefix = (data.localcache && data.localcache.prefix) || /^https?\:/
            for (var i = localStorage.length - 1; i >= 0; i--) {
                var key = localStorage.key(i)
                if (!prefix.test(key)) continue //Notice: change the search pattern if not match with your manifest style
                if (force || (remoteManifest && !remoteManifest[key])) {
                    localStorage.removeItem(key);
                }
            }
        }
    }
    qqasync.storage = storage;
})(this);