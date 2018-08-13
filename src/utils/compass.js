export default function compass(time) {
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