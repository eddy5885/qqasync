import evalCode from "./eval";

export function emitCallback(data) {
    var callbacks = data.callbackList;
    var ca;
    while (ca = callbacks.shift()) {
        ca.apply(global, arguments);
    }
}



export     function changeFilesStatus(data,url, responseText, loadedOrder) {
        data['fecthedList'][url] = {
            loaded: true,
            executed: false,
            loadedOrder: loadedOrder,
            code: responseText
        }
    }

    export     function getUrlwithoutPara(url) {
        return url && url.split("?")[0];
    }

    export  function syncExec(data,fileList) {
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



    export function asyncExec(data){
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
                        emitCallback(data);
                    }
                    break;
                }
            }
        }
    }

