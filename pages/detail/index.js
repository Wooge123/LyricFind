const util = require('../../utils/util.js')
const app = getApp()
let src = ''
let song = {}
let am = app.globalData.am
let cacheSong = ''
let cacheLyric = ''

Page({

  /**
   * 页面的初始数据
   */
  data: {
    id: '',
    name: '',
    artists: '',
    thumbnail: '',
    lyric: '',
    cleanLyric: '',
    curLyric: '',
    status: -1,
    duration: 0,
    palying: false,
    value: 0,
    pause: false,
    scrollHeight: 0,
    checked: false,
    onUnload: false,
  },

  onLoad: function(options) {
    this.setData({
      id: options.id
    })
    src = 'https://music.163.com/song/media/outer/url?id=' + this.data.id + '.mp3'
    cacheSong = wx.getStorageSync('song') || null
    if (cacheSong == null) {
      this.requestSong(options.id)
    } else if (cacheSong.id == options.id) {
      this.initSong(cacheSong)
    } else {
      this.requestSong(options.id)
    }
    cacheLyric = wx.getStorageSync('lyric') || null
    if (cacheLyric == null) {
      this.requestLyric(options.id)
    } else if (cacheLyric.id == options.id) {
      this.setData({
        lyric: cacheLyric.lyric,
        cleanLyric: cacheLyric.cleanLyric,
        curLyric: cacheLyric.cleanLyric
      })
    } else {
      this.requestLyric(options.id)
    }
  },

  // 请求歌词api
  requestLyric: function(id) {
    wx.request({
      method: 'GET',
      url: 'https://music.163.com/api/song/lyric',
      data: {
        id: id,
        lv: '-1',
        tv: '-1'
      },
      method: 'GET',
      success: res => {
        let lyric = ''
        let cleanLyric = ''
        let lrc = res.data.lrc.lyric
        if (lrc == null || lrc == '') {
          lyric = cleanLyric = '无歌词'
        } else {
          let tlyric = res.data.tlyric.lyric
          lrc = lrc.replace(/\..*?\]/g, '] ').trim()
          if (tlyric != null) {
            tlyric = tlyric.replace(/\..*?\]/g, '] ').trim()
            const larr = lrc.split('\n')
            const tarr = tlyric.split('\n')
            let sarr = []

            larr.forEach(function(l, j) {
              let val = ''
              if (/\[.*?\]/g.exec(l) != null) {
                /\[.*?\]/g.exec(l).forEach(function(m, n) {
                  val += m
                })
                sarr.push(val)
              }
            })

            tarr.forEach(function(v, i) {
              let res = '';
              if (/\[.*?\]/g.exec(v) != null) {
                /\[.*?\]/g.exec(v).forEach(function(o, p) {
                  res += o
                })
              }
              const index = sarr.lastIndexOf(res) + 1
              if (index == 0) return
              sarr.splice(index, 0, res)
              larr.splice(index, 0, v + '\n')
            })

            larr.forEach(function(e, f) {
              lyric += e + '\n'
            })
          } else {
            lyric = lrc.trim()
          }
        }
        lyric = lyric.replace(/\[.*?\].\n/g, '\n').trim()
        cleanLyric = lyric.replace(/\[.*?\]/g, '')
        this.setData({
          lyric: lyric,
          cleanLyric: cleanLyric,
          curLyric: cleanLyric
        })
      }
    })
  },

  // 设置歌曲数据
  initSong: function(song) {
    let artists = ''
    if (song.artists != null)
      song.artists.forEach((artist, i) => {
        artists = artists + artist.name + '/'
      })
    if (artists.charAt(artists.length - 1) == '/')
      artists = artists.substring(0, artists.length - 1)
    this.setData({
      name: song.name,
      artists: artists,
      duration: song.duration,
      thumbnail: song.album.blurPicUrl + "?param=130x130"
    })
  },

  // 请求歌曲api 
  requestSong: function(id) {
    let that = this
    wx.request({
      url: 'https://music.163.com/api/song/detail?ids=[' + id + ']',
      success: res => {
        song = res.data.songs[0]
        that.initSong(song)
      }
    })
  },

  //歌词开关
  switch2Change: function(e) {
    this.setData({
      curLyric: e.detail.value ? this.data.lyric : this.data.cleanLyric
    })
  },

  calHeight: function() {
    let that = this
    let query = wx.createSelectorQuery().in(this)
    query.select('.page-header').boundingClientRect(function(res) {
      const windowHeight = wx.getSystemInfoSync().windowHeight
      that.setData({
        scrollHeight: windowHeight - res.height
      });
    }).exec()
  },

  onShow: function() {
    let that = this
    wx.getBackgroundAudioPlayerState({
      success(res) {
        const ms = res.currentPosition * 1000
        if (res.dataUrl == src) {
          if (res.status == 1) {
            that.setData({
              playing: true,
              value: ms,
              checked: true,
              curLyric: cacheLyric.lyric
            })
          } else if (res.status == 0)
            that.setData({
              pause: true,
              playing: false,
              value: ms
            })
        }
      }
    })

    am.onTimeUpdate(function() {
      if (that.data.onUnload) return
      that.setData({
        value: Math.floor(am.currentTime * 1000)
      })
    })

    am.onPlay(function() {
      app.globalData.id = that.data.id
      that.setData({
        playing: true,
        checked: true,
        curLyric: that.data.lyric
      })
      that.calHeight()

      // 将歌曲信息添加到缓存
      wx.setStorage({
        key: 'song',
        data: song
      })

      cacheLyric = {
        "id": that.data.id,
        "lyric": that.data.lyric,
        "cleanLyric": that.data.cleanLyric
      }

      // 将歌词信息添加到缓存
      wx.setStorage({
        key: 'lyric',
        data: cacheLyric
      })
    })

    am.onError(function() {
      wx.showToast({
        title: '播放失败',
        image: '/images/removesign.png'
      })
    })

    am.onPause(function() {
      that.setData({
        pause: true,
        playing: false
      })
      that.calHeight()
    })

    am.onEnded(function() {
      that.setData({
        value: 0,
        playing: false,
        pause: false,
        checked: false,
        curLyric: that.data.cleanLyric
      })
      that.calHeight()
    })
    that.calHeight()
  },

  play: function() {
    am.title = this.data.name
    am.singer = this.data.artists
    am.coverImgUrl = this.data.thumbnail
    am.duration = this.data.duration
    am.src = src
  },

  copyLyric: function() {
    util.copyText(this.data.lyric, '歌词已复制')
  },

  playSong: function() {
    let that = this
    wx.getBackgroundAudioPlayerState({
      success(res) {
        if (res.dataUrl == src) {
          if (res.status == 1) {
            am.pause()
          }
          if (res.status == 0) {
            am.play()
          }
        } else {
          that.play(am)
        }
      },
      fail(err) {
        that.play(am)
      }
    })
    that.calHeight()
  },

  // 进度条拖动
  bindChanging: function(e) {
    this.setData({
      value: e.detail.value
    })
  },

  // 进度条拖动完成
  bindChange: function(e) {
    am.seek(e.detail.value / 1000)
  },

  onUnload: function() {
    this.setData({
      onUnload: true
    })
  },

  // 转发小程序
  onShareAppMessage: function(res) {

    const item = this.data.files[0]

    return {
      title: '歌曲详情',
      path: '/pages/detail/index?id=' + item.id
    }
  }
})