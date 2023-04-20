'use strict'

/* global chrome */

import * as power from './js/power.js'
import * as storage from './js/storage.js'
import * as offscreen from './js/offscreen.js'
import * as message from './js/message.js'
import * as downloads from './js/downloads.js'
import * as action from './js/action.js'

chrome.idle.setDetectionInterval(60)

chrome.action.onClicked.addListener(onActionClicked)
chrome.idle.onStateChanged.addListener(onIdleStateChanged)
chrome.storage.onChanged.addListener(onStorageChanged)

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
    await Promise.all([updateIcon(false), saveState(false)])
  } catch (error) {
    console.error('An error occurred:', error)
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

async function onDownloadCreated () {
  const allDownloads = await downloads.search('in_progress').catch((error) => {
    console.error('An error occurred:', error)
  })

  const hasInProgressDownloads = allDownloads.some(
    (download) => download.state === 'in_progress'
  )

  if (!hasInProgressDownloads) return

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

  if (
    hasInProgressDownloads &&
    !currentStatus &&
    storedPreferences?.autoDownloads.status
  ) {
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

  if (hasInProgressDownloads) return

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

  if (
    !hasInProgressDownloads &&
    currentStatus &&
    storedPreferences.autoDownloads.status
  ) {
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
  ) {
    return
  }

  const currentStatus = await storage
    .loadSession('status', false)
    .catch((error) => {
      console.error('An error occurred:', error)
    })

  if (currentStatus !== true) return

  power.releaseKeepAwake()
  power.keepAwake(newValue.displaySleep.status ? 'display' : 'system')
}
