import { useEffect, useState } from 'react'
import { requestNotificationPermission, onForegroundMessage, db } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'

export interface FCMNotification {
  title: string
  body: string
  type?: string
  timestamp: number
}

export function useFCM() {
  const { profile } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<FCMNotification[]>([])
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!profile) return

    // Request permission + get token
    requestNotificationPermission().then(async fcmToken => {
      if (!fcmToken) return
      setToken(fcmToken)
      await setDoc(doc(db, 'fcm_tokens', profile.id), {
        user_id: profile.id, token: fcmToken, updated_at: new Date().toISOString(),
      }, { merge: true })
    })

    // Handle foreground messages
    const unsub = onForegroundMessage((payload: any) => {
      const notif: FCMNotification = {
        title: payload?.notification?.title || 'Memory Mate',
        body:  payload?.notification?.body  || '',
        type:  payload?.data?.type,
        timestamp: Date.now(),
      }
      setNotifications(prev => [notif, ...prev].slice(0, 20))
      setUnread(u => u + 1)

      // Show native browser notification if in foreground
      if (Notification.permission === 'granted') {
        new Notification(notif.title, { body: notif.body, icon: '/favicon.svg' })
      }
    })

    return () => { if (typeof unsub === 'function') unsub() }
  }, [profile])

  function clearUnread() { setUnread(0) }

  return { token, notifications, unread, clearUnread }
}

