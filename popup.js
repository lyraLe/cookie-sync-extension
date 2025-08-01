const sourceInput = document.getElementById("sourceUrl");
const targetInput = document.getElementById("targetUrl");
const statusEl = document.getElementById("status");
const pairListEl = document.getElementById("pairList");

function renderPairs(pairs) {
  pairListEl.innerHTML = "";
  pairs.forEach((pair, index) => {
    const div = document.createElement("div");
    div.className = "pair";
    div.innerHTML = `
      <div><strong>源：</strong>${pair.source}</div>
      <div><strong>目标：</strong>${pair.target}</div>
      <button data-index="${index}" class="deleteBtn">删除</button>
    `;
    pairListEl.appendChild(div);
  });

  document.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const i = parseInt(e.target.dataset.index);
      chrome.storage.sync.get({ sitePairs: [] }, ({ sitePairs }) => {
        sitePairs.splice(i, 1);
        chrome.storage.sync.set({ sitePairs }, () => renderPairs(sitePairs));
      });
    });
  });
}

document.getElementById("addPairBtn").addEventListener("click", () => {
  const sourceUrl = sourceInput.value.trim();
  const targetUrl = targetInput.value.trim();

  if (!sourceUrl || !targetUrl) {
    statusEl.innerText = "请填写完整的源站和目标站 URL";
    return;
  }

  chrome.storage.sync.get({ sitePairs: [] }, ({ sitePairs }) => {
    sitePairs.push({ source: sourceUrl, target: targetUrl });
    chrome.storage.sync.set({ sitePairs }, () => {
      renderPairs(sitePairs);
      statusEl.innerText = "已添加规则";
    });
  });

  // ❌ 不再清空输入框（除非用户点击“清空”按钮）
});

document.getElementById("clearInputBtn").addEventListener("click", () => {
  sourceInput.value = "";
  targetInput.value = "";
});

document.getElementById("syncAllBtn").addEventListener("click", () => {
  chrome.storage.sync.get({ sitePairs: [] }, async ({ sitePairs }) => {
    for (const pair of sitePairs) {
      try {
        const cookies = await chrome.cookies.getAll({ url: pair.source });
        for (const cookie of cookies) {
          await chrome.cookies.set({
            url: pair.target,
            name: cookie.name,
            value: cookie.value,
            domain: new URL(pair.target).hostname,
            path: cookie.path || "/",
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite || "no_restriction",
            expirationDate: cookie.expirationDate || (Date.now() / 1000 + 3600)
          });
        }
      } catch (e) {
        console.warn(`同步失败: ${pair.source} ➜ ${pair.target}`, e);
      }
    }

    statusEl.innerText = "所有规则 Cookie 同步完成。";
  });
});

chrome.storage.sync.get({ sitePairs: [] }, ({ sitePairs }) => {
  renderPairs(sitePairs);
});

// 1. 监听输入变化并存入 storage
sourceInput.addEventListener("input", () => {
  chrome.storage.local.set({ currentSourceUrl: sourceInput.value });
});
targetInput.addEventListener("input", () => {
  chrome.storage.local.set({ currentTargetUrl: targetInput.value });
});

// 2. 页面打开时恢复输入框内容
chrome.storage.local.get(["currentSourceUrl", "currentTargetUrl"], (data) => {
  if (data.currentSourceUrl) sourceInput.value = data.currentSourceUrl;
  if (data.currentTargetUrl) targetInput.value = data.currentTargetUrl;
});
document.getElementById("clearInputBtn").addEventListener("click", () => {
  sourceInput.value = "";
  targetInput.value = "";
  chrome.storage.local.remove(["currentSourceUrl", "currentTargetUrl"]);
});
