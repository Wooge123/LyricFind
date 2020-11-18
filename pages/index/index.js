const app = getApp()
const brand = app.globalData.brand
const am = app.globalData.am

Page({
  data: {
    pageIndex: 1,
    offset: 0,
    songCount: 0,
    songs: [],
    thumbnails: [],
    keyword: '',
    searchRecord: [],
    fromSearch: false,
    noMoreData: false,
    isLoading: false,
    loadingText: '加载数据中...',
    loadMoreText: '上拉加载更多',
    noMoreText: '没有更多结果了',
    showUp: false,
    showAd: true,
    playing: false,
    showPlaying: false,
    song: {},
    mySongs: []
  },

  onLoad: function() {
    const searchRecord = wx.getStorageSync('searchRecord') || []
    this.setData({
      searchRecord: searchRecord
    })

    wx.request({
      url: 'https://51simple.com/api/51findlyric/song.json',
      success: res => {
        this.setData({
          mySongs: res.data
        })
      }
    })
  },

  onShow: function() {
    let that = this
    const cacheSong = wx.getStorageSync('song') || {}
    wx.getBackgroundAudioPlayerState({
      success(res) {
        if (res.status == 1) {
          that.setData({
            song: cacheSong,
            playing: true,
          })
          if (that.data.showPlaying) return
          else
            that.setData({
              showPlaying: true,
            })
        }
      }
    })

    am.onPlay(function() {
      that.setData({
        playing: true
      })
    })

    am.onPause(function() {
      that.setData({
        playing: false
      })
    })

    am.onEnded(function() {
      that.setData({
        playing: false
      })
    })
  },

  onPageScroll: function(res) {
    if (brand != 'iPhone') return
    if (res.scrollTop > 400) {
      if (!this.data.showUp)
        this.setData({
          showUp: true
        })
    } else if (this.data.showUp)
      this.setData({
        showUp: false
      })
  },

  toDetail: function(e) {
    wx.navigateTo({
      url: '/pages/detail/index?id=' + e.currentTarget.dataset.id,
    })
  },

  // 返回顶部事件
  backTop: function() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    })
    if (brand == 'iPhone')
      this.setData({
        showUp: false
      })
  },

  // 上拉加载更多
  onReachBottom: function() {
    if (this.data.isLoading || this.data.keyword == '' || this.data.noMoreData)
      return;
    const pageIndex = this.data.pageIndex + 1
    this.setData({
      pageIndex: pageIndex,
      isLoading: true
    })
    this.requestData(pageIndex);
  },

  //搜索输入框输入取值
  searchInputEvent: function(e) {
    let keyword = e.detail.value
    this.setData({
      keyword: keyword
    });
    if (keyword == '') {
      this.setData({
        pageIndex: 1,
        files: [],
        songCount: 0,
        noMoreData: false,
        showAd: false
      })
      if (brand != 'iPhone')
        this.setData({
          showUp: false
        })
    }
  },

  //搜索按钮点击事件
  searchClickEvent: function(e) {
    if (!this.data.keyword) return
    this.setData({
      pageIndex: 1,
      fromSearch: true
    })
    this.requestData(1);
  },

  songDetail: function(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/detail/index?id=' + id
    })
  },

  // 播放控制
  ppControl: function() {
    let that = this
    wx.getBackgroundAudioPlayerState({
      success(res) {
        console.log(res.status)
        if (res.status == 0) am.play()
        else if (res.status == 1) am.pause()
        else {
          am.src = 'https://music.163.com/song/media/outer/url?id=' + that.data.song.id + '.mp3'
          am.title = that.data.song.name
          am.singer = that.data.song.artists
        }
      }
    })
  },

  // 清空历史
  clearHistory: function() {
    this.setData({
      searchRecord: []
    })
    wx.setStorage({
      key: 'searchRecord',
      data: []
    })
  },

  // 历史搜索点击
  historyClick: function(e) {
    const keyword = e.currentTarget.dataset.value
    this.setData({
      keyword: keyword
    })
    this.requestData(1)
  },

  /**
   * 请求数据
   */
  requestData: function(pageIndex) {
    if (pageIndex == 1) {
      this.setData({
        songs: [],
        songCount: 0,
        noMoreData: false,
        showUp: false
      })
      wx.showLoading({
        title: '搜索歌曲中...',
      })
    }
    let that = this
    const data = {
      s: this.data.keyword,
      type: 1,
      limit: 10,
      offset: this.data.offset + (pageIndex - 1) * 10
    }
    wx.request({
      url: 'https://music.163.com/api/search/get',
      method: 'GET',
      data: data,
      success: function(res) {
        wx.hideLoading()
        if (res.statusCode == 200) {
          const result = res.data.result
          if (result.songCount == 0) {
            wx.showToast({
              title: '找不到歌曲',
              icon: 'none',
              duration: 800
            })
          } else if (result.songs == null)
            that.setData({
              noMoreData: true,
            })
          else {
            that.setData({
              songs: that.data.songs.concat(result.songs),
              songCount: result.songCount
            })
            if (brand != 'iPhone' && pageIndex > 1 && !that.data.showUp)
              that.setData({
                showUp: true
              })
            if (that.data.fromSearch) {
              let searchRecord = that.data.searchRecord
              let keyword = that.data.keyword;
              for (let i = 0; i < searchRecord.length; i++) {
                if (keyword == searchRecord[i].value) return
              }
              if (searchRecord.length >= 8)
                searchRecord.pop() // 删除最早的一条记录
              searchRecord.unshift({
                value: that.data.keyword,
              })
              // 将历史记录添加到缓存中
              wx.setStorage({
                key: 'searchRecord',
                data: searchRecord,
                success: function(res) {
                  that.setData({
                    searchRecord: searchRecord,
                    fromSearch: false
                  })
                }
              })
            }
          }
        } else {
          wx.showToast({
            title: '请求失败',
            icon: 'none',
            duration: 800
          })
        }
      },
      fail: function(e) {
        wx.hideLoading()
        wx.showToast({
          title: '请求失败',
          icon: 'none',
          duration: 800
        })
      },
      complete: function(e) {
        that.setData({
          isLoading: false
        })
      }
    })
  },

  // 转发小程序
  onShareAppMessage: function(res) {
    return {
      title: '咕咕盘搜',
      path: '/pages/index/index'
    }
  }
})