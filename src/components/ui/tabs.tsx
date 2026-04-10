import * as React from "react"
import { cn } from "../../lib/utils"

const Tabs = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string; onValueChange: (value: string) => void }>(
  ({ className, value, onValueChange, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, { value, onValueChange })
          }
          return child
        })}
      </div>
    )
  }
)
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value?: string; onValueChange?: (value: string) => void }>(
  ({ className, value, onValueChange, children, ...props }, ref) => (
    <div ref={ref} className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-500", className)} {...props}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { contextValue: value, onValueChange })
        }
        return child
      })}
    </div>
  )
)
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string; contextValue?: string; onValueChange?: (value: string) => void }>(
  ({ className, value, contextValue, onValueChange, ...props }, ref) => {
    const isSelected = value === contextValue
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => onValueChange?.(value)}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isSelected ? "bg-white text-slate-950 shadow-sm" : "hover:bg-slate-200/50 hover:text-slate-900",
          className
        )}
        {...props}
      />
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string; contextValue?: string; onValueChange?: any }>(
  ({ className, value, contextValue, onValueChange, ...props }, ref) => {
    if (value !== contextValue) return null
    return (
      <div
        ref={ref}
        className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
        {...props}
      />
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
