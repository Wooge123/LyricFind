// 复制文本到剪切板
function copyText(data, title) {
  wx.setClipboardData({
    data: data,
    success: function (res) {
      wx.showToast({
        title: title,
        icon: 'success'
      })
    }
  })
}

module.exports = {
  copyText: copyText
}
