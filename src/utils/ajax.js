//ajax 拉取数据
export default function fetchAjax(url, callback) {
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
                if (!requestInfo[url]) {
                    compass(1);
                } else {
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
                } else {
                    compass(4);
                }
            }
        }
    }
    xhr.send(null)
}