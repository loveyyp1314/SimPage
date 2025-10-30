/**
 * GitHub Pages 适配器
 * 用于在 GitHub Pages 静态部署环境下通过 GitHub Actions 保存数据
 */

const GITHUB_PAGES_CONFIG_KEY = 'simpage_github_config';

/**
 * 检测是否运行在 GitHub Pages 模式下
 */
export function isGitHubPagesMode() {
  const config = getGitHubConfig();
  return config && config.enabled;
}

/**
 * 获取存储的 GitHub 配置
 */
export function getGitHubConfig() {
  try {
    const stored = localStorage.getItem(GITHUB_PAGES_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load GitHub config:', e);
  }
  return null;
}

/**
 * 保存 GitHub 配置
 */
export function saveGitHubConfig(config) {
  try {
    localStorage.setItem(GITHUB_PAGES_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('Failed to save GitHub config:', e);
    return false;
  }
}

/**
 * 清除 GitHub 配置
 */
export function clearGitHubConfig() {
  try {
    localStorage.removeItem(GITHUB_PAGES_CONFIG_KEY);
  } catch (e) {
    console.error('Failed to clear GitHub config:', e);
  }
}

/**
 * 通过 GitHub Actions workflow 保存数据
 */
export async function saveDataViaGitHub(data, config) {
  if (!config || !config.token || !config.owner || !config.repo) {
    throw new Error('GitHub 配置不完整');
  }

  const { token, owner, repo } = config;

  try {
    // 准备要保存的完整数据
    const fullData = {
      settings: data.settings || {},
      apps: data.apps || [],
      bookmarks: data.bookmarks || [],
      stats: data.stats || { visitorCount: 0 },
      admin: data.admin || {
        passwordHash: "1a968cba0c9a05b2b235aa54a29bc91ef30a5a8a202dc290cf862070e14e259fad87c94f6f33ce1b2b36a75b233ef282b1298ca12fc96894a3abf38ff9e75b8a",
        passwordSalt: "fc87045b067a37f3cb01105a91b55b10"
      }
    };

    const jsonData = JSON.stringify(fullData, null, 2);
    
    // 使用 base64 编码以避免特殊字符问题
    const base64Data = btoa(unescape(encodeURIComponent(jsonData)));

    // 触发 GitHub Actions workflow
    const workflowUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/update-navigation-data.yml/dispatches`;
    
    const payload = {
      ref: config.branch || 'main',
      inputs: {
        navigationDataBase64: base64Data,
        commitMessage: 'Update navigation data from admin panel',
        authorName: 'SimPage Admin',
        authorEmail: 'admin@simpage.local'
      }
    };

    const response = await fetch(workflowUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 404) {
        throw new Error('GitHub Actions workflow 不存在，请确保已部署 .github/workflows/update-navigation-data.yml 文件');
      }
      throw new Error(error.message || `保存失败 (${response.status})`);
    }

    return { success: true, data: fullData };
  } catch (error) {
    console.error('Failed to save via GitHub:', error);
    throw error;
  }
}

/**
 * 从 GitHub 加载数据
 */
export async function loadDataFromGitHub(config) {
  if (!config || !config.owner || !config.repo) {
    throw new Error('GitHub 配置不完整');
  }

  const { token, owner, repo, branch = 'main' } = config;

  try {
    // 直接从 GitHub Pages 或原始文件获取
    // 优先尝试从 raw.githubusercontent.com 获取（无需 token）
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/data/navigation.json`;
    
    let response = await fetch(rawUrl + '?t=' + Date.now()); // 添加时间戳避免缓存

    // 如果失败且有 token，尝试使用 API
    if (!response.ok && token) {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/navigation.json?ref=${branch}`;
      response = await fetch(apiUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });

      if (response.ok) {
        const fileData = await response.json();
        const content = atob(fileData.content);
        return JSON.parse(content);
      }
    }

    if (!response.ok) {
      if (response.status === 404) {
        // 文件不存在，返回默认数据
        return getDefaultNavigationData();
      }
      throw new Error(`加载数据失败 (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to load from GitHub:', error);
    throw error;
  }
}

/**
 * 获取默认导航数据
 */
function getDefaultNavigationData() {
  return {
    settings: {
      siteName: "SimPage",
      siteLogo: "",
      greeting: "",
      footer: "",
      weather: { city: "北京" }
    },
    apps: [],
    bookmarks: [],
    stats: { visitorCount: 0 },
    admin: {
      passwordHash: "1a968cba0c9a05b2b235aa54a29bc91ef30a5a8a202dc290cf862070e14e259fad87c94f6f33ce1b2b36a75b233ef282b1298ca12fc96894a3abf38ff9e75b8a",
      passwordSalt: "fc87045b067a37f3cb01105a91b55b10"
    }
  };
}

/**
 * 验证 GitHub 配置是否有效
 */
export async function validateGitHubConfig(config) {
  if (!config || !config.token || !config.owner || !config.repo) {
    return { valid: false, message: '配置不完整' };
  }

  try {
    // 测试能否访问仓库
    const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}`, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { valid: false, message: 'Token 无效或已过期' };
      } else if (response.status === 404) {
        return { valid: false, message: '仓库不存在或无访问权限' };
      }
      return { valid: false, message: '无法访问仓库' };
    }

    // 验证 token 是否有 workflow 权限
    const repoData = await response.json();
    const permissions = repoData.permissions || {};
    
    if (!permissions.push) {
      return { valid: false, message: 'Token 需要具有仓库的写入权限（push）' };
    }

    // 检查 workflow 文件是否存在
    const workflowCheck = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/.github/workflows/update-navigation-data.yml?ref=${config.branch || 'main'}`,
      {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      }
    );

    if (!workflowCheck.ok) {
      return { 
        valid: true, 
        warning: 'workflow 文件不存在，保存功能可能无法使用。请确保仓库中包含 .github/workflows/update-navigation-data.yml 文件。' 
      };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, message: error.message || '配置验证失败' };
  }
}

/**
 * 获取仓库信息（用于自动检测）
 */
export function detectGitHubRepo() {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // GitHub Pages 的 URL 格式：
  // 用户站点：username.github.io
  // 项目站点：username.github.io/repo-name/
  
  if (hostname.endsWith('.github.io')) {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const owner = parts[0];
      
      // 提取仓库名
      const pathParts = pathname.split('/').filter(p => p);
      const repo = pathParts.length > 0 ? pathParts[0] : owner + '.github.io';
      
      return { owner, repo };
    }
  }

  return null;
}

/**
 * 检测是否需要后端 API（通过尝试连接）
 */
export async function checkBackendAvailability() {
  try {
    const response = await fetch('/api/admin/data', {
      method: 'HEAD',
      cache: 'no-cache'
    });
    return response.ok || response.status === 401; // 401 表示后端存在但需要认证
  } catch (e) {
    return false; // 无法连接到后端
  }
}
