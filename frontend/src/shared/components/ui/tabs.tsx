import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Tabs as TabsPrimitive } from 'radix-ui'

type IndicatorPosition = { x: number; width: number; visible: boolean }

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn('group/tabs flex gap-2 data-[orientation=horizontal]:flex-col', className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  'group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        line: 'gap-1 rounded-none bg-transparent p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>
>(function TabsList({ className, variant = 'default', children, ...props }, forwardedRef) {
  const listRef = React.useRef<React.ElementRef<typeof TabsPrimitive.List>>(null)
  const [indicator, setIndicator] = React.useState<IndicatorPosition>({ x: 0, width: 0, visible: false })
  const [horizontal, setHorizontal] = React.useState(true)

  React.useImperativeHandle(forwardedRef, () => listRef.current as React.ElementRef<typeof TabsPrimitive.List>)

  React.useLayoutEffect(() => {
    const list = listRef.current
    if (!list || variant !== 'line') return

    const measure = () => {
      const root = list.closest<HTMLElement>('[data-slot="tabs"]')
      const isHorizontal = root?.dataset.orientation !== 'vertical'
      setHorizontal((previous) => previous === isHorizontal ? previous : isHorizontal)
      if (!isHorizontal || list.getClientRects().length === 0) {
        setIndicator((previous) => previous.visible ? { ...previous, visible: false } : previous)
        return
      }

      const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
      if (!active || active.getClientRects().length === 0) {
        setIndicator((previous) => previous.visible ? { ...previous, visible: false } : previous)
        return
      }

      const next = { x: active.offsetLeft, width: active.offsetWidth, visible: active.offsetWidth > 0 }
      setIndicator((previous) => previous.x === next.x && previous.width === next.width && previous.visible === next.visible ? previous : next)
    }

    let frame = 0
    const scheduleMeasure = () => {
      if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        measure()
        return
      }
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(measure)
    }

    measure()
    const mutations = new MutationObserver(scheduleMeasure)
    mutations.observe(list, { attributes: true, attributeFilter: ['data-state', 'disabled', 'hidden', 'class', 'style'], childList: true, subtree: true })
    const root = list.closest<HTMLElement>('[data-slot="tabs"]')
    if (root && root !== list) mutations.observe(root, { attributes: true, attributeFilter: ['data-orientation'] })

    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleMeasure)
    if (resize) {
      resize.observe(list)
      list.querySelectorAll<HTMLElement>('[role="tab"]').forEach((trigger) => resize.observe(trigger))
    }
    const windowResize = () => scheduleMeasure()
    window.addEventListener('resize', windowResize)

    return () => {
      mutations.disconnect()
      resize?.disconnect()
      window.removeEventListener('resize', windowResize)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [variant])

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), variant === 'line' && 'relative', className)}
      {...props}
    >
      {children}
      {variant === 'line' && horizontal && <span
        aria-hidden="true"
        data-slot="tabs-indicator"
        className="pointer-events-none absolute bottom-0 left-0 z-[1] h-0.5 bg-primary transition-[transform,width,opacity] duration-[250ms] ease-out motion-reduce:transition-none"
        style={{ width: indicator.width, transform: `translateX(${indicator.x}px)`, opacity: indicator.visible ? 1 : 0 }}
      />}
    </TabsPrimitive.List>
  )
})

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        'group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-0 group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:shadow-none group-data-[variant=line]/tabs-list:data-[state=active]:rounded-none group-data-[variant=line]/tabs-list:data-[state=active]:border-0 group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:text-primary group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none',
        'data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
