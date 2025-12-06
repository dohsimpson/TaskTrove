"use strict"
;(() => {
  var c = "tasktrove-notifications-v1",
    s = "task-due-"
  self.addEventListener("install", (t) => {
    ;(console.log("[TaskTrove SW] Installing..."),
      t.waitUntil(caches.open(c).then((i) => i.addAll(["/favicon.ico"]))))
  })
  self.addEventListener("activate", (t) => {
    ;(console.log("[TaskTrove SW] Activating..."),
      t.waitUntil(
        Promise.all([
          caches
            .keys()
            .then((i) =>
              Promise.all(
                i
                  .filter((o) => o.startsWith("tasktrove-notifications") && o !== c)
                  .map(
                    (o) => (console.log("[TaskTrove SW] Deleting old cache:", o), caches.delete(o)),
                  ),
              ),
            ),
          self.clients.claim(),
        ]),
      ))
  })
  self.addEventListener("notificationclick", (t) => {
    console.log("[Notification SW] Notification clicked:", t.notification.data)
    let i = t.notification,
      o = i.data || {}
    ;(i.close(),
      t.action === "complete-task" ? u(o.taskId) : t.action === "snooze-task" ? h(o.taskId) : N(o))
  })
  self.addEventListener("notificationclose", (t) => {
    console.log("[Notification SW] Notification closed:", t.notification.data)
    let i = t.notification.data || {}
    i.taskId && i.type && w(i.taskId, i.type)
  })
  self.addEventListener("message", (t) => {
    console.log("[Notification SW] Received message:", t.data)
    let { type: i, payload: o } = t.data
    switch (i) {
      case "SCHEDULE_NOTIFICATION":
        g(o)
        break
      case "CANCEL_NOTIFICATION":
        k(o.taskId)
        break
      case "SHOW_NOTIFICATION":
        l(o)
        break
      case "PING":
        t.ports[0] && t.ports[0].postMessage({ type: "PONG" })
        break
      default:
        console.warn("[Notification SW] Unknown message type:", i)
    }
  })
  self.addEventListener("push", (t) => {
    if ((console.log("[Notification SW] Push received:", t.data?.text()), !!t.data))
      try {
        let i = t.data.json()
        i.type === "task-due" && t.waitUntil(d(i))
      } catch (i) {
        console.error("[Notification SW] Error handling push:", i)
      }
  })
  async function l(t) {
    let { taskId: i, taskTitle: o, type: e, notifyAt: n } = t
    try {
      if (!(await y())) {
        console.log("[Notification SW] Notification blocked by settings")
        return
      }
      let f = {
        body: `Your task "${o}" is now due.`,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `${s}${i}`,
        requireInteraction: !0,
        silent: !1,
        timestamp: Date.now(),
        data: { taskId: i, taskTitle: o, type: e, url: `/?highlight=${i}`, notifyAt: n },
        actions: [
          { action: "complete-task", title: "Mark Complete", icon: "/icons/check.png" },
          { action: "snooze-task", title: "Snooze", icon: "/icons/snooze.png" },
        ],
      }
      ;(await self.registration.showNotification(`Task Due: ${o}`, f),
        E(i, e),
        console.log("[Notification SW] Showed notification for task:", i))
    } catch (a) {
      console.error("[Notification SW] Error showing notification:", a)
    }
  }
  async function d(t) {
    return l({ taskId: t.taskId, taskTitle: t.taskTitle, type: "due", notifyAt: t.notifyAt })
  }
  function g(t) {
    ;(console.log("[Notification SW] Notification scheduled:", t.taskId), S(t))
  }
  function k(t) {
    ;(console.log("[Notification SW] Cancelling notification for task:", t),
      p(t),
      self.registration.getNotifications({ tag: `${s}${t}` }).then((i) => {
        i.forEach((o) => o.close())
      }))
  }
  async function N(t) {
    let { taskId: i } = t
    try {
      let e = (await self.clients.matchAll({ type: "window", includeUncontrolled: !0 })).filter(
        (n) => "focus" in n,
      )
      for (let n of e)
        if (n.url.includes(self.location.origin)) {
          ;(await n.focus(), n.postMessage({ type: "FOCUS_TASK", taskId: i }))
          return
        }
      await self.clients.openWindow(`${self.location.origin}/?highlight=${i}`)
    } catch (o) {
      console.error("[Notification SW] Error handling notification click:", o)
    }
  }
  async function u(t) {
    console.log("[Notification SW] Completing task:", t)
    try {
      ;((await self.clients.matchAll()).forEach((o) => {
        o.postMessage({ type: "COMPLETE_TASK", taskId: t })
      }),
        await self.registration.showNotification("Task Completed", {
          body: "Task has been marked as complete.",
          icon: "/favicon.ico",
          tag: `task-completed-${t}`,
          requireInteraction: !1,
          silent: !0,
        }),
        r(t, "complete"))
    } catch (i) {
      console.error("[Notification SW] Error completing task:", i)
    }
  }
  async function h(t) {
    console.log("[Notification SW] Snoozing task:", t)
    try {
      ;((await self.clients.matchAll()).forEach((o) => {
        o.postMessage({ type: "SNOOZE_TASK", taskId: t, snoozeMinutes: 15 })
      }),
        r(t, "snooze"))
    } catch (i) {
      console.error("[Notification SW] Error snoozing task:", i)
    }
  }
  function S(t) {
    console.log("[Notification SW] Storing scheduled notification:", t.taskId)
  }
  function p(t) {
    console.log("[Notification SW] Removing scheduled notification:", t)
  }
  async function y() {
    return !0
  }
  function E(t, i) {
    console.log("[Notification SW] Tracking notification shown:", { taskId: t, type: i })
  }
  function w(t, i) {
    console.log("[Notification SW] Tracking notification dismissal:", { taskId: t, type: i })
  }
  function r(t, i) {
    console.log("[Notification SW] Tracking notification action:", { taskId: t, action: i })
  }
  self.addEventListener("sync", (t) => {
    let i = t
    ;(console.log("[Notification SW] Background sync:", i.tag),
      i.tag === "notification-check" && i.waitUntil(W()))
  })
  async function W() {
    console.log("[Notification SW] Checking pending notifications")
  }
  console.log("[Notification SW] Service Worker loaded")
})()
