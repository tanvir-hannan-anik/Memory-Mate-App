import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import TabBar, { TabItem } from '@/components/ui/TabBar'
import DesktopSidebar from '@/components/layout/DesktopSidebar'
import Dashboard from './Dashboard'
import Location from './Location'
import Conversations from './Conversations'
import Remind from './Remind'
import Plans from './Plans'
import CaregiverProfile from './CaregiverProfile'
import { useLang } from '@/contexts/LangContext'
import { useIsMobile } from '@/hooks/useIsMobile'

export default function CaregiverApp() {
  const { tr } = useLang()
  const isMobile = useIsMobile()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'dashboard'
  const setTab = (id: string) => setSearchParams({ tab: id }, { replace: true })

  const tabs: TabItem[] = [
    { id: 'dashboard',     label: tr('Home',      'হোম'),        icon: 'home'      },
    { id: 'location',      label: tr('Location',  'অবস্থান'),    icon: 'map-pin'   },
    { id: 'plans',         label: tr('Plans',     'পরিকল্পনা'),  icon: 'calendar'  },
    { id: 'conversations', label: tr('Messages',  'বার্তা'),      icon: 'chat'      },
    { id: 'remind',        label: tr('Remind',    'অনুস্মারক'),  icon: 'bell'      },
    { id: 'profile',       label: tr('Profile',   'প্রোফাইল'),   icon: 'user'      },
  ]

  const content = (
    <>
      {tab === 'dashboard'     && <Dashboard onTabChange={setTab} />}
      {tab === 'location'      && <Location />}
      {tab === 'plans'         && <Plans />}
      {tab === 'conversations' && <Conversations />}
      {tab === 'remind'        && <Remind />}
      {tab === 'profile'       && <CaregiverProfile />}
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
          role="caregiver"
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
      <TabBar tabs={tabs} active={tab} onChange={setTab} />
    </div>
  )
}
