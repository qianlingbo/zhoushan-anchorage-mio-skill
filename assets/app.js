/* 舟山锚地供油指数看板 — 渲染逻辑 */
(function () {
  "use strict";

  var DATA_URL = "./data/latest.json";

  var MIO_LABELS = ["风力", "阵风", "浪高", "能见度"];

  var MIO_COLORS = {
    4: { cls: "mio-4", label: "适宜", bg: "#2f9d57" },
    3: { cls: "mio-3", label: "一般", bg: "#f5a623" },
    2: { cls: "mio-2", label: "较差", bg: "#f5732a" },
    1: { cls: "mio-1", label: "恶劣", bg: "#e53e3e" },
  };

  /* ── Data loading ── */

  function loadData() {
    if (window.__ANCHOR_DATA__) {
      return Promise.resolve(window.__ANCHOR_DATA__);
    }
    return fetch(DATA_URL + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("读取数据失败: " + r.status);
        return r.json();
      });
  }

  /* ── Helpers ── */

  function parseRiskrating(str) {
    if (!str) return [0, 0, 0, 0];
    return str.trim().split(/\s+/).map(Number);
  }

  function overallRating(ratings) {
    return Math.min.apply(null, ratings.filter(function (v) { return v > 0; }));
  }

  function ratingColor(val) {
    return MIO_COLORS[val] || MIO_COLORS[1];
  }

  /**
   * Parse "23日08时-11时" into a comparable value to detect current slot.
   * Returns { day: number, startHour: number, endHour: number }
   */
  function parseTimeSlot(timeStr) {
    var m = timeStr.match(/(\d+)日(\d+)时.*?(\d+)时/);
    if (!m) return null;
    return {
      day: parseInt(m[1], 10),
      startHour: parseInt(m[2], 10),
      endHour: parseInt(m[3], 10),
    };
  }

  function getCurrentSlotIndex(forecasts) {
    var now = new Date();
    var day = now.getDate();
    var hour = now.getHours();

    for (var i = 0; i < forecasts.length; i++) {
      var slot = parseTimeSlot(forecasts[i].Time);
      if (!slot) continue;
      if (slot.day === day && hour >= slot.startHour && hour < slot.endHour) {
        return i;
      }
      // Handle overnight: e.g. "23时-02时" means endHour < startHour
      if (slot.endHour <= slot.startHour) {
        if (slot.day === day && hour >= slot.startHour) return i;
        // next day early hours
        var nextDay = day + 1; // simplified, won't cross month boundary in 3-day forecast
        if (slot.day === day && hour < slot.endHour) return i;
      }
    }
    // If not found, highlight the first slot (nearest future)
    return 0;
  }

  /* ── Rendering ── */

  function makeMioDots(ratings) {
    var html = '<div class="mio-cell">';
    for (var i = 0; i < ratings.length; i++) {
      var val = ratings[i];
      var info = ratingColor(val);
      html += '<span class="mio-dot ' + info.cls + '" title="' + MIO_LABELS[i] + ': ' + info.label + '(' + val + ')"></span>';
    }
    html += "</div>";
    return html;
  }

  function buildTable(forecasts, currentIdx) {
    var html = '<div class="forecast-table-wrap"><table class="forecast-table">';
    html += "<thead><tr>";
    html += "<th>时段</th><th>风向</th><th>平均风速</th><th>阵风</th><th>浪高</th><th>能见度</th><th>MIO评分</th>";
    html += "</tr></thead><tbody>";

    var prevDay = null;

    for (var i = 0; i < forecasts.length; i++) {
      var f = forecasts[i];
      var ratings = parseRiskrating(f.Riskrating);
      var slot = parseTimeSlot(f.Time);
      var dayVal = slot ? slot.day : null;

      var rowClass = "";
      if (i === currentIdx) rowClass += " current-slot";
      if (prevDay !== null && dayVal !== null && dayVal !== prevDay) rowClass += " day-sep";
      prevDay = dayVal;

      html += '<tr class="' + rowClass.trim() + '">';
      html += "<td>" + escapeHtml(f.Time) + "</td>";
      html += "<td>" + escapeHtml(f.WindDirect) + "</td>";
      html += "<td>" + escapeHtml(String(f.WindSpeedAvg)) + " m/s</td>";
      html += "<td>" + escapeHtml(String(f.WindSpeed)) + " m/s</td>";
      html += "<td>" + escapeHtml(f.WindWave) + "</td>";
      html += "<td>" + escapeHtml(f.Vis) + "</td>";
      html += "<td>" + makeMioDots(ratings) + "</td>";
      html += "</tr>";
    }

    html += "</tbody></table></div>";
    return html;
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str || ""));
    return div.innerHTML;
  }

  function buildCard(name, anchorData) {
    var forecasts = anchorData.PreciseForecast || [];
    var currentIdx = getCurrentSlotIndex(forecasts);

    // Overall rating = min of current slot's ratings
    var currentRatings = forecasts.length > 0 ? parseRiskrating(forecasts[currentIdx].Riskrating) : [0];
    var overall = overallRating(currentRatings);
    var overallInfo = ratingColor(overall);

    var card = document.createElement("article");
    card.className = "anchor-card";

    var headerHtml = '<header class="anchor-header">';
    headerHtml += "<div>";
    headerHtml += '<h2 class="anchor-name">' + escapeHtml(name) + "</h2>";
    if (anchorData.PreciseForecastTime) {
      headerHtml += '<p class="anchor-publish-time">发布: ' + escapeHtml(anchorData.PreciseForecastTime) + "</p>";
    }
    headerHtml += "</div>";
    headerHtml += '<span class="overall-badge" style="background:' + overallInfo.bg + '22;color:' + overallInfo.bg + '">';
    headerHtml += '<span class="dot" style="background:' + overallInfo.bg + '"></span>';
    headerHtml += "当前 " + overallInfo.label;
    headerHtml += "</span>";
    headerHtml += "</header>";

    card.innerHTML = headerHtml + buildTable(forecasts, currentIdx);

    // Add MIO legend
    var legend = document.createElement("div");
    legend.className = "mio-legend";
    legend.innerHTML =
      '<span class="mio-legend-item"><span class="mio-legend-dot" style="background:var(--mio-4)"></span>4 适宜</span>' +
      '<span class="mio-legend-item"><span class="mio-legend-dot" style="background:var(--mio-3)"></span>3 一般</span>' +
      '<span class="mio-legend-item"><span class="mio-legend-dot" style="background:var(--mio-2)"></span>2 较差</span>' +
      '<span class="mio-legend-item"><span class="mio-legend-dot" style="background:var(--mio-1)"></span>1 恶劣</span>' +
      '<span class="mio-legend-item" style="margin-left:8px;border-left:1px solid #ddd;padding-left:12px">● 顺序：风力 阵风 浪高 能见度</span>';
    card.appendChild(legend);

    return card;
  }

  function render(data) {
    var grid = document.getElementById("anchor-grid");
    var publishTime = document.getElementById("publish-time");
    var lastUpdated = document.getElementById("last-updated");
    var status = document.getElementById("status-pill");
    var weatherText = document.getElementById("weather-text");

    publishTime.textContent = data.publishTime || "未知";
    lastUpdated.textContent = data.lastUpdated || "未知";
    status.textContent = data.status || "已加载";

    // Show weather text from first anchor
    var anchorNames = Object.keys(data.anchors || {});
    if (anchorNames.length > 0) {
      var firstAnchor = data.anchors[anchorNames[0]];
      if (firstAnchor && firstAnchor.Text) {
        var textContent = firstAnchor.Text.replace(/<br\s*\/?>/gi, " ");
        weatherText.innerHTML = "<strong>天气概况：</strong>" + escapeHtml(textContent);
      }
    }

    grid.innerHTML = "";

    for (var i = 0; i < anchorNames.length; i++) {
      var name = anchorNames[i];
      var card = buildCard(name, data.anchors[name]);
      grid.appendChild(card);
    }
  }

  function renderError(error) {
    var grid = document.getElementById("anchor-grid");
    var lastUpdated = document.getElementById("last-updated");
    var status = document.getElementById("status-pill");
    lastUpdated.textContent = "读取失败";
    status.textContent = "本地数据暂不可用";
    grid.innerHTML =
      '<article class="anchor-card" style="grid-column:1/-1;padding:40px;text-align:center">' +
      '<h2 style="margin:0 0 12px;font-size:20px">数据读取失败</h2>' +
      '<p style="color:var(--muted)">' + escapeHtml(error.message) + "</p>" +
      '<p style="color:var(--muted);margin-top:12px">请先运行 <code>python3 scripts/update_data.py</code> 生成数据文件。</p>' +
      "</article>";
  }

  function refresh() {
    loadData()
      .then(function (data) { render(data); })
      .catch(function (err) { renderError(err); });
  }

  document.getElementById("refresh-button").addEventListener("click", function () {
    // Re-read from data.js by reloading the page, or try fetch
    if (window.__ANCHOR_DATA__) {
      render(window.__ANCHOR_DATA__);
    } else {
      refresh();
    }
  });

  refresh();
})();
