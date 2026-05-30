import { useState, useEffect } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import TabBar, { TabItem } from '@/components/ui/TabBar'
import DesktopSidebar from '@/components/layout/DesktopSidebar'
import Icon from '@/components/ui/Icon'
import Today from './Today'
import Memories from './Memories'
import Chat from './Chat'
import Plans from './Plans'
import PatientProfile from './Profile'
import Emergency from './Emergency'
import { useLang } from '@/contexts/LangContext'
import { useIsMobile } from '@/hooks/useIsMobile'

export default function PatientApp() {
  const { tr } = useLang()
  const isMobile = useIsMobile()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'today'
  const setTab = (id: string) => setSearchParams({ tab: id }, { replace: true })
  const location = useLocation()

  const [showEmergency, setShowEmergency] = useState(false)
  const [openChatSessions, setOpenChatSessions] = useState(false)
  const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>(undefined)
  const [chatInlineMemories, setChatInlineMemories] = useState<object[] | undefined>(undefined)

  // Handle navigation from Transcript "Ask Memory Mate" button
  useEffect(() => {
    const state = location.state as { tab?: string; initialMessage?: string; inlineMemories?: object[] } | null
    if (state?.tab === 'chat') {
      setTab('chat')
      if (state.initialMessage) setChatInitialMessage(state.initialMessage)
      if (state.inlineMemories) setChatInlineMemories(state.inlineMemories)
      window.history.replaceState({}, '')
    }
  }, [location.state])

  function handleRecentChats() {
    setTab('chat')
    setOpenChatSessions(true)
  }

  const tabs: TabItem[] = [
    { id: 'today',    label: tr('Today',    'আজ'),          icon: 'sun'      },
    { id: 'memories', label: tr('Memories', 'স্মৃতি'),       icon: 'mic'      },
    { id: 'chat',     label: tr('Chat',     'চ্যাট'),        icon: 'chat'     },
    { id: 'plans',    label: tr('Plans',    'পরিকল্পনা'),    icon: 'calendar' },
    { id: 'profile',  label: tr('Profile',  'প্রোফাইল'),     icon: 'user'     },
  ]

  const content = (
    <>
      {tab === 'today'    && <Today />}
      {tab === 'memories' && <Memories />}
      {tab === 'chat'     && <Chat openSessions={openChatSessions} onSessionsOpened={() => setOpenChatSessions(false)} initialMessage={chatInitialMessage} inlineMemories={chatInlineMemories} onInitialMessageSent={() => { setChatInitialMessage(undefined); setChatInlineMemories(undefined) }} />}
      {tab === 'plans'    && <Plans />}
      {tab === 'profile'  && <PatientProfile />}
      {showEmergency && <Emergency onClose={() => setShowEmergency(false)} />}
    </>
  )

  /* ── Desktop layout ── */
  if (!isMobile) {
    return (
      <div className="desktop-root w-full">
        <DesktopSidebar
          items={tabs}
          active={tab}
          onChange={setTab}
          role="patient"
          onEmergency={() => setShowEmergency(true)}
          onRecentChats={handleRecentChats}
        />
        <div className="desktop-main">
          <div className="desktop-page">
            {content}
          </div>
        </div>
      </div>
    )
  }

  /* ── Mobile layout ── */
  return (
    <div className="relative flex flex-col h-dvh">
      <div className="flex-1 flex flex-col overflow-hidden">
        {content}
      </div>
      <TabBar
        tabs={tabs}
        active={tab}
        onChange={setTab}
        extra={
          <button
            onClick={() => setShowEmergency(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center emergency-ring"
            style={{ background: 'var(--color-danger)' }}
          >
            <Icon name="alert-triangle" size={18} color="white" />
          </button>
        }
      />
    </div>
  )
}
