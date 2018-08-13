export default function(str) {
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