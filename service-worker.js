// 缓存名称
const CACHE_NAME = 'kitten-gashapon-cache-v1';

// 需要缓存的资源
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// 安装 Service Worker
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('缓存已打开');
        return cache.addAll(urlsToCache);
      })
  );
});

// 激活 Service Worker
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // 立即接管所有页面
  return self.clients.claim();
});

// 拦截请求并从缓存中提供资源
self.addEventListener('fetch', function(event) {
  // 跳过不支持缓存的请求（如API请求）
  if (event.request.url.includes('api.jsonbin.io')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // 如果找到缓存的响应，则返回缓存
        if (response) {
          return response;
        }
        
        // 克隆请求，因为请求是一个流，只能使用一次
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(function(response) {
            // 检查是否是有效的响应
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应，因为响应是一个流，只能使用一次
            const responseToCache = response.clone();
            
            // 打开缓存并存储响应
            caches.open(CACHE_NAME)
              .then(function(cache) {
                // 不缓存带有查询参数的URL
                if (!event.request.url.includes('?')) {
                  cache.put(event.request, responseToCache);
                }
              });
            
            return response;
          })
          .catch(function(error) {
            // 当网络请求失败时，尝试提供离线页面
            console.log('获取请求失败:', error);
            
            // 如果是HTML页面请求，可以返回离线页面
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// 后台同步
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// 推送通知
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || '有新消息！',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || '小猫扭蛋机', options)
    );
  }
});

// 点击通知
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// 数据同步函数
async function syncData() {
  // 获取所有待同步的数据
  const dataToSync = await getDataToSync();
  
  if (!dataToSync || dataToSync.length === 0) {
    return;
  }
  
  // 尝试同步每一条数据
  for (const item of dataToSync) {
    try {
      // 执行同步
      await performSync(item);
      
      // 标记为已同步
      await markAsSynced(item.id);
    } catch (error) {
      console.error('同步数据失败:', error);
    }
  }
}

// 获取待同步数据（示例实现）
async function getDataToSync() {
  // 这里应该从IndexedDB或其他存储中获取待同步的数据
  // 这只是一个示例实现
  return [];
}

// 执行同步（示例实现）
async function performSync(item) {
  // 这里应该实现实际的同步逻辑
  console.log('同步数据:', item);
}

// 标记为已同步（示例实现）
async function markAsSynced(id) {
  // 这里应该更新存储，标记数据为已同步
  console.log('标记为已同步:', id);
}

// 预缓存常用图片
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'CACHE_IMAGES') {
    const imagesToCache = event.data.images || [];
    
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(function(cache) {
          return Promise.all(
            imagesToCache.map(function(imageUrl) {
              return fetch(imageUrl)
                .then(function(response) {
                  return cache.put(imageUrl, response);
                })
                .catch(function(error) {
                  console.error('缓存图片失败:', imageUrl, error);
                });
            })
          );
        })
    );
  }
});

// 定期清理过期缓存
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'CLEAR_OLD_CACHES') {
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            // 清理非当前版本的缓存
            if (cacheName !== CACHE_NAME && cacheName.startsWith('kitten-gashapon-cache')) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
});

console.log('Service Worker 已加载');
