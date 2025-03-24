// 配置信息
const CONFIG = {
  binId: '67e04c0d8960c979a576f646',
  apiKey: '$2a$10$qFSedI2vR8ip8TiEZgmHb.W2Fg2YinWfC/SNjfvxVkEdDlwPkfN0i',
  adminPassword: 'Younj1031'
};

// 全局数据对象
let globalData = {
  balance: 100,
  images: [],
  history: []
};

// 检查是否是管理员
let isAdmin = false;

// API请求函数 - 使用简化的fetch包装器
async function makeApiRequest(url, method = 'GET', body = null) {
  try {
    const options = {
      method: method,
      headers: {
        'X-Master-Key': CONFIG.apiKey,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      console.error(`API错误: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('API请求错误:', error);
    return null;
  }
}

// 页面加载时获取数据
async function loadData() {
  const data = await makeApiRequest(`https://api.jsonbin.io/v3/b/${CONFIG.binId}/latest`);
  
  if (!data) {
    alert('无法加载数据，请刷新页面重试');
    return false;
  }
  
  // 更新全局数据
  globalData = data.record;
  
  // 如果是首次使用，初始化数据结构
  if (!globalData.balance) globalData.balance = 100;
  if (!globalData.images) globalData.images = [];
  if (!globalData.history) globalData.history = [];
  
  return true;
}

// 保存数据到JSONBin
async function saveData() {
  const result = await makeApiRequest(
    `https://api.jsonbin.io/v3/b/${CONFIG.binId}`, 
    'PUT', 
    globalData
  );
  
  return result !== null;
}

// 初始化扭蛋页面
async function initGashaponPage() {
  // 加载数据
  const loadSuccess = await loadData();
  if (!loadSuccess) return;
  
  // 更新UI
  updateUserInterface();
  
  // 设置扭蛋功能
  setupGashaponEvents();
}

// 初始化管理页面
async function initAdminPage() {
  // 验证管理员身份
  if (!checkAdminAuth()) {
    window.location.href = 'index.html';
    return;
  }
  
  // 加载数据
  const loadSuccess = await loadData();
  if (!loadSuccess) return;
  
  // 更新UI
  updateAdminInterface();
  
  // 设置管理功能
  setupAdminEvents();
}

// 更新用户界面
function updateUserInterface() {
  const balanceElement = document.getElementById('balance');
  const historyContainer = document.getElementById('history');
  
  if (balanceElement) {
    balanceElement.textContent = globalData.balance;
  }
  
  if (historyContainer) {
    displayHistory(historyContainer);
  }
}

// 更新管理界面
function updateAdminInterface() {
  const balanceElement = document.getElementById('admin-balance');
  const imageListContainer = document.getElementById('image-list');
  const historyContainer = document.getElementById('admin-history');
  const galleryContainer = document.getElementById('image-gallery');
  
  if (balanceElement) {
    balanceElement.textContent = globalData.balance;
  }
  
  if (imageListContainer) {
    displayImageList(imageListContainer);
  }
  
  if (historyContainer) {
    displayAdminHistory(historyContainer);
  }
  
  if (galleryContainer) {
    displayImageGallery(galleryContainer);
  }
}

// 设置扭蛋事件
function setupGashaponEvents() {
  const drawButton = document.getElementById('draw-button');
  const resultContainer = document.getElementById('result');
  const resultImage = document.getElementById('result-image');
  const resultText = document.getElementById('result-text');
  const closeResultButton = document.getElementById('close-result');
  
  if (!drawButton || !resultContainer || !resultImage || !resultText || !closeResultButton) {
    console.error('页面元素不存在');
    return;
  }
  
  // 扭蛋按钮点击事件
  drawButton.addEventListener('click', async function() {
    drawButton.disabled = true; // 防止重复点击
    
    try {
      // 刷新数据
      await loadData();
      
      const cost = 10;
      if (globalData.balance < cost) {
        alert('余额不足！请等待管理员添加硬币。');
        drawButton.disabled = false;
        return;
      }
      
      // 扣除硬币
      globalData.balance -= cost;
      
      // 抽取图片
      const drawnImage = drawRandomImage();
      
      if (!drawnImage) {
        alert('抽奖失败，图片库为空，请联系管理员添加图片。');
        globalData.balance += cost; // 退回硬币
        drawButton.disabled = false;
        return;
      }
      
      // 添加到历史记录
      globalData.history.push({
        url: drawnImage.url,
        description: drawnImage.description,
        timestamp: new Date().toISOString()
      });
      
      // 保存数据
      const saveSuccess = await saveData();
      
      if (!saveSuccess) {
        alert('保存抽奖结果失败，请重试');
        globalData.balance += cost; // 退回硬币
        globalData.history.pop(); // 移除历史记录
        drawButton.disabled = false;
        return;
      }
      
      // 更新界面
      updateUserInterface();
      
      // 显示结果
      resultImage.src = drawnImage.url;
      resultText.textContent = drawnImage.description;
      resultContainer.style.display = 'flex';
      
    } catch (error) {
      console.error('抽奖过程出错:', error);
      alert('抽奖过程出错，请重试');
    } finally {
      drawButton.disabled = false;
    }
  });
  
  // 关闭结果弹窗
  closeResultButton.addEventListener('click', function() {
    resultContainer.style.display = 'none';
  });

  // 下载图片按钮
  const downloadButton = document.getElementById('download-result');
  if (downloadButton) {
    downloadButton.addEventListener('click', function() {
      const image = document.getElementById('result-image');
      const imageUrl = image.src;
      const description = document.getElementById('result-text').textContent;
      
      downloadImage(imageUrl, description);
    });
  }
  
  // 添加触摸反馈
  const allButtons = document.querySelectorAll('button');
  allButtons.forEach(button => {
    button.addEventListener('touchstart', function() {
      this.style.transform = 'scale(0.95)';
    });
    
    button.addEventListener('touchend', function() {
      this.style.transform = '';
    });
  });
  
  // 优化移动端图片查看体验
  setupImageViewer();
}

// 设置图片查看器
function setupImageViewer() {
  // 为历史记录中的图片添加点击查看功能
  document.addEventListener('click', function(e) {
    const target = e.target;
    
    // 检查是否点击了历史记录中的图片
    if (target.tagName === 'IMG' && 
        (target.closest('.history-item') || 
         target.closest('.gallery-item') || 
         target.closest('.image-item'))) {
      
      // 创建全屏查看图片的弹窗
      const overlay = document.createElement('div');
      overlay.className = 'fullscreen-overlay';
      
      const fullImg = document.createElement('img');
      fullImg.src = target.src;
      fullImg.style.maxWidth = '90%';
      fullImg.style.maxHeight = '90%';
      fullImg.style.objectFit = 'contain';
      
      overlay.appendChild(fullImg);
      document.body.appendChild(overlay);
      
      // 点击关闭
      overlay.addEventListener('click', function() {
        document.body.removeChild(overlay);
      });
    }
  });
}

// 设置管理页面事件
function setupAdminEvents() {
  const balanceAmountInput = document.getElementById('balance-amount');
  const addBalanceButton = document.getElementById('add-balance');
  const reduceBalanceButton = document.getElementById('reduce-balance');
  const imageUrlInput = document.getElementById('image-url');
  const imageDescriptionInput = document.getElementById('image-description');
  const addImageButton = document.getElementById('add-image');
  const resetMachineButton = document.getElementById('reset-machine');
  
  if (!addBalanceButton || !reduceBalanceButton || !addImageButton) {
    console.error('管理页面元素不存在');
    return;
  }
  
  // 增加余额
  addBalanceButton.addEventListener('click', async function() {
    const amount = parseInt(balanceAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
      alert('请输入有效数量!');
      return;
    }
    
    // 刷新数据
    await loadData();
    
    globalData.balance += amount;
    
    const saveSuccess = await saveData();
    if (saveSuccess) {
      updateAdminInterface();
      balanceAmountInput.value = '';
    } else {
      alert('保存失败，请重试');
    }
  });
  
  // 减少余额
  reduceBalanceButton.addEventListener('click', async function() {
    const amount = parseInt(balanceAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
      alert('请输入有效数量!');
      return;
    }
    
    // 刷新数据
    await loadData();
    
    globalData.balance = Math.max(0, globalData.balance - amount);
    
    const saveSuccess = await saveData();
    if (saveSuccess) {
      updateAdminInterface();
      balanceAmountInput.value = '';
    } else {
      alert('保存失败，请重试');
    }
  });
  
  // 添加图片
  if (addImageButton) {
    addImageButton.addEventListener('click', async function() {
      const url = imageUrlInput.value.trim();
      const description = imageDescriptionInput.value.trim();
      
      if (!url || !description) {
        alert('请填写图片URL和描述!');
        return;
      }
      
      // 刷新数据
      await loadData();
      
      globalData.images.push({
        url: url,
        description: description
      });
      
      const saveSuccess = await saveData();
      if (saveSuccess) {
        updateAdminInterface();
        imageUrlInput.value = '';
        imageDescriptionInput.value = '';
      } else {
        alert('保存失败，请重试');
      }
    });
  }
  
  // 重置扭蛋机
  if (resetMachineButton) {
    resetMachineButton.addEventListener('click', async function() {
      if (confirm('确定要重置扭蛋机吗？所有历史记录将被清空！')) {
        // 刷新数据
        await loadData();
        
        // 保留图片库和余额，清空历史记录
        globalData.history = [];
        
        const saveSuccess = await saveData();
        if (saveSuccess) {
          alert('扭蛋机已成功重置！');
          updateAdminInterface();
        } else {
          alert('重置失败，请重试');
        }
      }
    });
  }
  
  // 添加触摸反馈
  const allButtons = document.querySelectorAll('button');
  allButtons.forEach(button => {
    button.addEventListener('touchstart', function() {
      this.style.transform = 'scale(0.95)';
    });
    
    button.addEventListener('touchend', function() {
      this.style.transform = '';
    });
  });
}

// 随机抽取图片逻辑 - 均等概率
function drawRandomImage() {
  if (!globalData.images || globalData.images.length === 0) return null;
  
  // 所有图片均等概率
  const randomIndex = Math.floor(Math.random() * globalData.images.length);
  return globalData.images[randomIndex];
}

// 添加下载图片的通用函数
function downloadImage(imageUrl, description) {
  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // 创建下载链接
  const downloadLink = document.createElement('a');
  
  // 尝试使用图片描述作为文件名
  let fileName = description.replace(/[^\w\u4e00-\u9fa5]/gi, '_').substring(0, 30);
  if (!fileName) {
    fileName = 'gacha_image';
  }
  
  // 如果是直接的图片URL
  if (imageUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i)) {
    downloadLink.href = imageUrl;
    downloadLink.download = fileName + imageUrl.substring(imageUrl.lastIndexOf('.'));
    
    // 在iOS上，直接点击下载链接可能不起作用，提示用户长按保存
    if (isMobile && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      alert('请长按图片并选择"保存图片"');
      window.open(imageUrl);
    } else {
      downloadLink.click();
    }
  } 
  // 如果不是直接图片URL，需要转换
  else {
    // 创建一个临时图片元素
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.src = imageUrl;
    
    tempImg.onload = function() {
      // 创建一个canvas来转换图片
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.width = tempImg.naturalWidth;
      canvas.height = tempImg.naturalHeight;
      
      context.drawImage(tempImg, 0, 0);
      
      // 转换为数据URL并下载
      try {
        const dataURL = canvas.toDataURL('image/png');
        downloadLink.href = dataURL;
        downloadLink.download = fileName + '.png';
        
        // 在iOS上，直接点击下载链接可能不起作用，提示用户长按保存
        if (isMobile && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          alert('请长按图片并选择"保存图片"');
          
          // 创建一个新窗口显示图片
          const imgWindow = window.open('');
          imgWindow.document.write('<img src="' + dataURL + '" style="max-width:100%;">');
          imgWindow.document.title = fileName;
        } else {
          downloadLink.click();
        }
      } catch (e) {
        console.error('下载图片失败:', e);
        alert('下载图片失败，可能是由于图片来自不同域名的安全限制。请长按图片并选择"保存图片"。');
        
        // 尝试直接打开图片
        window.open(imageUrl);
      }
    };
    
    tempImg.onerror = function() {
      alert('无法加载图片，下载失败。请尝试长按图片并选择"保存图片"。');
      window.open(imageUrl);
    };
  }
}

// 显示历史记录
function displayHistory(container) {
  container.innerHTML = '';
  
  if (!globalData.history || globalData.history.length === 0) {
    container.innerHTML = '<p>还没有抽到任何图片。</p>';
    return;
  }
  
  // 显示最近的10条记录
  const recentHistory = [...globalData.history].reverse().slice(0, 10);
  
  recentHistory.forEach(item => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.description;
    img.loading = 'lazy'; // 懒加载优化
    
    const text = document.createElement('p');
    text.textContent = item.description;
    
    // 添加下载按钮
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-button history-download-btn';
    downloadBtn.textContent = '下载';
    downloadBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 防止触发图片查看器
      downloadImage(item.url, item.description);
    });
    
    historyItem.appendChild(img);
    historyItem.appendChild(text);
    historyItem.appendChild(downloadBtn);
    container.appendChild(historyItem);
  });
}

// 显示管理员页面的扭蛋历史记录
function displayAdminHistory(container) {
  container.innerHTML = '';
  
  if (!globalData.history || globalData.history.length === 0) {
    container.innerHTML = '<p>暂无扭蛋记录。</p>';
    return;
  }
  
  // 检测是否为移动设备
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    // 移动设备使用卡片视图
    const historyList = document.createElement('div');
    historyList.className = 'history-items';
    
    [...globalData.history].reverse().forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item admin-history-item';
      
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = item.description;
      img.loading = 'lazy';
      
      const timestamp = new Date(item.timestamp).toLocaleString();
      const timeText = document.createElement('p');
      timeText.className = 'history-time';
      timeText.textContent = timestamp;
      
      const descText = document.createElement('p');
      descText.textContent = item.description;
      
      historyItem.appendChild(img);
      historyItem.appendChild(timeText);
      historyItem.appendChild(descText);
      historyList.appendChild(historyItem);
    });
    
    container.appendChild(historyList);
  } else {
    // 桌面设备使用表格视图
    const table = document.createElement('table');
    table.className = 'history-table';
    
    // 添加表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>时间</th>
        <th>图片</th>
        <th>描述</th>
      </tr>
    `;
    table.appendChild(thead);
    
    // 添加表格内容
    const tbody = document.createElement('tbody');
    [...globalData.history].reverse().forEach(item => {
      const row = document.createElement('tr');
      
      // 时间列
      const timeCell = document.createElement('td');
      const timestamp = new Date(item.timestamp).toLocaleString();
      timeCell.textContent = timestamp;
      
      // 图片列
      const imageCell = document.createElement('td');
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = item.description;
      img.className = 'history-thumbnail';
      img.loading = 'lazy';
      imageCell.appendChild(img);
      
      // 描述列
      const descCell = document.createElement('td');
      descCell.textContent = item.description;
      
      row.appendChild(timeCell);
      row.appendChild(imageCell);
      row.appendChild(descCell);
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
  }
}

// 显示图片库
function displayImageGallery(container) {
  container.innerHTML = '';
  
  if (!globalData.images || globalData.images.length === 0) {
    container.innerHTML = '<p>图片库为空，请添加图片。</p>';
    return;
  }
  
  const galleryWrapper = document.createElement('div');
  galleryWrapper.className = 'gallery-wrapper';
  
  globalData.images.forEach(image => {
    const galleryItem = document.createElement('div');
    galleryItem.className = 'gallery-item';
    
    const img = document.createElement('img');
    img.src = image.url;
    img.alt = image.description;
    img.loading = 'lazy';
    
    const desc = document.createElement('p');
    desc.textContent = image.description;
    desc.className = 'gallery-description';
    
    galleryItem.appendChild(img);
    galleryItem.appendChild(desc);
    galleryWrapper.appendChild(galleryItem);
  });
  
  container.appendChild(galleryWrapper);
  
  // 添加统计信息
  const statsDiv = document.createElement('div');
  statsDiv.className = 'gallery-stats';
  statsDiv.innerHTML = `<p>图片总数: <strong>${globalData.images.length}</strong></p>`;
  container.appendChild(statsDiv);
}

// 显示图片列表
function displayImageList(container) {
  container.innerHTML = '';
  
  if (!globalData.images || globalData.images.length === 0) {
    container.innerHTML = '<p>暂无图片，请添加。</p>';
    return;
  }
  
  globalData.images.forEach((image, index) => {
    const imageItem = document.createElement('div');
    imageItem.className = 'image-item';
    
    const img = document.createElement('img');
    img.src = image.url;
    img.alt = image.description;
    img.loading = 'lazy';
    
    const text = document.createElement('p');
    text.textContent = image.description;
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = '删除';
    deleteButton.addEventListener('click', async function() {
      // 刷新数据
      await loadData();
      
      // 找到当前索引
      const currentIndex = globalData.images.findIndex(img => 
        img.url === image.url && img.description === image.description
      );
      
      if (currentIndex !== -1) {
        globalData.images.splice(currentIndex, 1);
        
        const saveSuccess = await saveData();
        if (saveSuccess) {
          displayImageList(container);
          // 更新图片库显示
          const galleryContainer = document.getElementById('image-gallery');
          if (galleryContainer) {
            displayImageGallery(galleryContainer);
          }
        } else {
          alert('删除失败，请重试');
        }
      }
    });
    
    imageItem.appendChild(img);
    imageItem.appendChild(text);
    imageItem.appendChild(deleteButton);
    
    container.appendChild(imageItem);
  });
}

// 检查管理员权限
function checkAdminAuth() {
  const savedPassword = localStorage.getItem('adminPassword');
  
  if (savedPassword === CONFIG.adminPassword) {
    isAdmin = true;
    return true;
  }
  
  const password = prompt('请输入管理员密码:');
  
  if (password === CONFIG.adminPassword) {
    localStorage.setItem('adminPassword', password);
    isAdmin = true;
    return true;
  } else {
    alert('密码错误！将返回主页');
    return false;
  }
}

// 优化移动端图片加载
function optimizeImagesForMobile() {
  const allImages = document.querySelectorAll('img');
  const isMobile = window.innerWidth <= 768;
  
  allImages.forEach(img => {
    // 为移动设备设置较低分辨率的图片
    if (isMobile && img.dataset.mobileUrl) {
      img.src = img.dataset.mobileUrl;
    }
    
    // 添加加载指示器
    img.addEventListener('load', function() {
      this.style.opacity = '1';
    });
    
    img.style.transition = 'opacity 0.3s';
    img.style.opacity = '0.1';
  });
}

// 防止在移动设备上的缩放问题
function preventZoomOnFocus() {
  // 防止iOS设备上输入框聚焦时的缩放
  const metaViewport = document.querySelector('meta[name=viewport]');
  if (metaViewport && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    document.addEventListener('focusin', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
      }
    });
    
    document.addEventListener('focusout', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    });
  }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('页面加载完成');
  
  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // 移动设备优化
    document.body.classList.add('mobile-device');
    
    // 防止缩放问题
    preventZoomOnFocus();
    
    // 优化触摸体验
    document.addEventListener('touchmove', function(e) {
      // 防止在结果弹窗打开时页面滚动
      if (document.getElementById('result') && 
          document.getElementById('result').style.display === 'flex') {
        e.preventDefault();
      }
    }, { passive: false });
  }
  
  if (window.location.pathname.includes('admin.html')) {
    console.log('初始化管理页面');
    initAdminPage();
  } else {
    console.log('初始化扭蛋页面');
    initGashaponPage();
  }
  
  // 优化图片加载
  optimizeImagesForMobile();
});

// 在窗口大小改变时重新优化图片
window.addEventListener('resize', optimizeImagesForMobile);

// 添加离线支持
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('service-worker.js').then(function(registration) {
      console.log('ServiceWorker 注册成功: ', registration.scope);
    }, function(err) {
      console.log('ServiceWorker 注册失败: ', err);
    });
  });
}
