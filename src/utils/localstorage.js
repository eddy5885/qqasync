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

    export default storage;