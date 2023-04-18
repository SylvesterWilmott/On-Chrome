'use strict'

/* global chrome */

import * as power from './js/power.js'
import * as storage from './js/storage.js'
import * as offscreen from './js/offscreen.js'
import * as message from './js/message.js'
import * as downloads from './js/downloads.js'
import * as menu from './js/menus.js'
import * as alarm from './js/alarms.js'
import * as action from './js/action.js'

chrome.runtime.onInstalled.addListener(init)
chrome.permissions.onAdded.addListener(initializePermissions)
chrome.permissions.onRemoved.addListener(initializePermissions)
chrome.action.onClicked.addListener(onActionClicked)
chrome.idle.onStateChanged.addListener(onIdleStateChanged)
chrome.storage.onChanged.addListener(onStorageChanged)
chrome.contextMenus.onClicked.addListener(onMenuClick)
chrome.alarms.onAlarm.addListener(onAlarmTick)

async function init () {
  try {
    await Promise.all([
      action.setBadgeColor('#AE2F32'),
      initializeMenu()
    ])
  } catch (error) {
    console.error('An error occurred:', error)
    return
  }

  chrome.idle.setDetectionInterval(60)
  initializePermissions()
}

async function onMenuClick (info) {
  const menuId = info.menuItemId

  const durations = ['10', '30', '60', '240', '480', '720']
  if (!durations.includes(menuId.replace('timer_', ''))) return

  const existingTimer = await alarm.get('timer').catch((error) => {
    console.error('An error occurred:', error)
  })

  if (existingTimer) {
    try {
      await alarm.clear('timer')
    } catch (error) {
      console.error('An error occurred:', error)
    }
  }

  const timerDuration = parseInt(menuId.replace('timer_', ''))

  try {
    await Promise.all([
      storage.saveSession('timer', timerDuration),
      action.setBadge(getFormattedDuration(timerDuration.toString())),
      alarm.create('timer', 1, 1),
      turnOn()
    ])
  } catch (error) {
    console.error('An error occurred:', error)
  }
}

async function onAlarmTick () {
  let remainingDuration = await storage
    .loadSession('timer', 10)
    .catch((error) => {
      console.error('An error occurred:', error)
    })

  if (remainingDuration > 0) {
    remainingDuration--

    try {
      await Promise.all([
        storage.saveSession('timer', remainingDuration),
        action.setBadge(getFormattedDuration(remainingDuration.toString())),
        alarm.create('timer', 1, 1)
      ])
    } catch (error) {
      console.error('An error occurred:', error)
    }
  } else {
    try {
      await turnOff()
    } catch (error) {
      console.error('An error occurred:', error)
    }
  }
}

async function turnOn () {
  const storedPreferences = await storage
    .load('preferences', storage.preferenceDefaults)
    .catch((error) => {
      console.error('An error occurred:', error)
    })

  if (storedPreferences.sounds.status) {
    try {
      await playSound('click')
    } catch (error) {
      console.error('An error occurred:', error)
    }
  }

  power.keepAwake(storedPreferences.displaySleep.status ? 'display' : 'system')

  try {
    await Promise.all([updateIcon(true), saveState(true)])
  } catch (error) {
    console.error('An error occurred:', error)
  }
}

async function turnOff () {
  const storedPreferences = await storage
    .load('preferences', storage.preferenceDefaults)
    .catch((error) => {
      console.error('An error occurred:', error)
    })

  if (storedPreferences.sounds.status) {
    try {
      await playSound('beep')
    } catch (error) {
      console.error('An error occurred:', error)
    }
  }

  power.releaseKeepAwake()

  try {
    await Promise.all([
      action.setBadge(''),
      updateIcon(false),
      saveState(false)
    ])
  } catch (error) {
    console.error('An error occurred:', error)
  }

  const existingTimer = await alarm.get('timer').catch((error) => {
    console.error('An error occurred:', error)
  })

  if (existingTimer) {
    try {
      await alarm.clear('timer')
    } catch (error) {
      console.error('An error occurred:', error)
    }
  }
}

async function onActionClicked () {
  const currentStatus = await storage
    .loadSession('status', false)
    .catch((error) => {
      console.error('An error occurred:', error)
    })

  if (currentStatus === true) {
    try {
      await turnOff()
    } catch (error) {
      console.error('An error occurred:', error)
    }
  } else {
    try {
      await turnOn()
    } catch (error) {
      console.error('An error occurred:', error)
    }
  }
}

async function playSound (sound) {
  const documentPath = 'audio-player.html'
  const hasDocument = await offscreen
    .hasDocument(documentPath)
    .catch((error) => {
      console.error('An error occurred:', error)
    })

  if (!hasDocument) {
    try {
      await offscreen.create(documentPath)
    } catch (error) {
      console.error('An error occurred:', error)
    }
  }

  try {
    await message.send({ msg: 'play_sound', sound })
  } catch (error) {
    console.error('An error occurred:', error)
  }
}

async function saveState (state) {
  try {
    await storage.saveSession('status', state)
  } catch (error) {
    console.error('An error occurred:', error)
  }
}

async function updateIcon (state) {
  try {
    await action.setIcon(`./images/icon32${state ? '_active' : ''}.png`)
  } catch (error) {
    console.error('An error occurred:', error)
  }
}

async function onIdleStateChanged (state) {
  if (state !== 'locked') return

  const currentStatus = await storage
    .loadSession('status', false)
    .catch((error) => {
      console.error('An error occurred:', error)
    })

  if (currentStatus) {
    try {
      await turnOff()
    } catch (error) {
      console.error('An error occurred:', error)
    }
  }
}

async function initializeMenu () {
  const menuItems = [
    {
      title: chrome.i18n.getMessage('MENU_DURATION_PARENT'),
      contexts: ['action'],
      id: 'h_1'
    },
    {
      title: chrome.i18n.getMessage('MENU_DURATION_10'),
      contexts: ['action'],
      id: 'timer_10',
      parentId: 'h_1'
    },
    {
      title: chrome.i18n.getMessage('MENU_DURATION_30'),
      contexts: ['action'],
      id: 'timer_10',
      parentId: 'h_1'
    },
    {
      title: chrome.i18n.getMessage('MENU_DURATION_60'),
      contexts: ['action'],
      id: 'timer_60',
      parentId: 'h_1'
    },
    {
      title: chrome.i18n.getMessage('MENU_DURATION_240'),
      contexts: ['action'],
      id: 'timer_240',
      parentId: 'h_1'
    },
    {
      title: chrome.i18n.getMessage('MENU_DURATION_480'),
      contexts: ['action'],
      id: 'timer_480',
      parentId: 'h_1'
    },
    {
      title: chrome.i18n.getMessage('MENU_DURATION_720'),
      contexts: ['action'],
      id: 'timer_720',
      parentId: 'h_1'
    }
  ]

  try {
    await menu.create(menuItems)
  } catch (error) {
    console.error('An error occurred:', error)
  }
}

function initializePermissions () {
  chrome.permissions.contains(
    {
      permissions: ['downloads']
    },
    (result) => {
      if (result) {
        chrome.downloads.onCreated.addListener(onDownloadCreated)
        chrome.downloads.onChanged.addListener(onDownloadsChanged)
      }
    }
  )
}

async function onDownloadCreated () {
  const currentStatus = await storage
    .loadSession('status', false)
    .catch((error) => {
      console.error('An error occurred:', error)
    })

  const storedPreferences = await storage
    .load('preferences', storage.preferenceDefaults)
    .catch((error) => {
      console.error('An error occurred:', error)
    })

  if (!currentStatus && storedPreferences?.autoDownloads.status) {
    try {
      await turnOn()
    } catch (error) {
      console.error('An error occurred:', error)
    }
  }
}

async function onDownloadsChanged () {
  const allDownloads = await downloads.search('in_progress').catch((error) => {
    console.error('An error occurred:', error)
  })

  const hasInProgressDownloads = allDownloads.some(
    (download) => download.state === 'in_progress'
  )

  const storedPreferences = await storage
    .load('preferences', storage.preferenceDefaults)
    .catch((error) => {
      console.error('An error occurred:', error)
    })

  if (!hasInProgressDownloads && storedPreferences.autoDownloads.status) {
    try {
      await turnOff()
    } catch (error) {
      console.error('An error occurred:', error)
    }
  }
}

async function onStorageChanged (changes, areaName) {
  if (areaName !== 'sync' || !changes.preferences) return

  const { oldValue, newValue } = changes.preferences

  if (
    !oldValue ||
    !newValue ||
    oldValue.displaySleep.status === newValue.displaySleep.status
  ) { return }

  const currentStatus = await storage
    .loadSession('status', false)
    .catch((error) => {
      console.error('An error occurred:', error)
    })

  if (currentStatus !== true) return

  power.releaseKeepAwake()
  power.keepAwake(newValue.displaySleep.status ? 'display' : 'system')
}

function getFormattedDuration (duration) {
  if (duration === 0) {
    return duration.toString() + chrome.i18n.getMessage('MINUTES_ABBREVIATION')
  }

  const hours = Math.floor(duration / 60)
  const minutes = duration % 60

  const formatted = []
  if (hours > 0) formatted.push(hours.toString() + chrome.i18n.getMessage('HOURS_ABBREVIATION'))
  if (minutes > 0) { formatted.push(hours > 0 ? minutes.toString() : minutes.toString() + chrome.i18n.getMessage('MINUTES_ABBREVIATION')) }

  return formatted.join('')
}