# qqasync
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
