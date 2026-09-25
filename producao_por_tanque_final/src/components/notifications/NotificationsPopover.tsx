import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertNotification } from '@/lib/types'
import { alertService } from '@/services/alertService'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function NotificationsPopover() {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [notifications, setNotifications] = useState<
    (AlertNotification & { ruleName: string })[]
  >([])
  const [loading, setLoading] = useState(false)

  const fetchCount = async () => {
    try {
      const c = await alertService.getUnreadCount()
      setCount(c)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const data = await alertService.getNotifications(20) // limit 20
      setNotifications(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCount()
    // Poll for notifications every 30s
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      fetchNotifications()
    }
  }

  const handleMarkAsRead = async () => {
    try {
      await alertService.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setCount(0)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {count > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1"
              onClick={handleMarkAsRead}
            >
              Marcar lidas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Nenhuma notificação recente.
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn('p-4 text-sm', !n.isRead && 'bg-muted/30')}
                >
                  <div className="font-medium mb-1 text-xs text-primary">
                    {n.ruleName}
                  </div>
                  <p className="text-muted-foreground mb-2">{n.message}</p>
                  <div className="text-[10px] text-muted-foreground/70 text-right">
                    {format(parseISO(n.triggeredAt), 'dd/MM/yyyy HH:mm', {
                      locale: ptBR,
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
