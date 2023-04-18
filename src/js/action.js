'use strict'

/* global chrome */

export function setIcon (path) {
  return new Promise((resolve, reject) => {
    chrome.action.setIcon(
      {
        path
      },
      function () {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
        }
        resolve()
      }
    )
  })
}

export function setBadge (text) {
  return new Promise((resolve, reject) => {
    chrome.action.setBadgeText(
      {
        text
      },
      function () {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
        }
        resolve()
      }
    )
  })
}

export function getBadge () {
  return new Promise((resolve, reject) => {
    chrome.action.getBadgeText(function (text) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message)
      }
      resolve(text)
    })
  })
}

export function setBadgeColor (color) {
  return new Promise((resolve, reject) => {
    chrome.action.setBadgeBackgroundColor(
      {
        color
      },
      function () {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
        }
        resolve()
      }
    )
  })
}
