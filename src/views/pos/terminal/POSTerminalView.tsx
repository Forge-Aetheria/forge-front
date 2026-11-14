'use client'

// React Imports
import { useEffect, useState, useMemo } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

// Type Imports
import type { ProductTemplate, ProductVariant } from '@/types/inventoryTypes'
import type { POSCartItem, POSCustomer, ParkedOrder, POSPaymentRecord, ChangeResolutionType } from '@/types/posTypes'
import { getInventoryTemplates } from '@/services/inventoryService'
import { defaultCustomer } from '@/data/pos/mockPosData'
import {
  getBCVRate,
  setBCVRate,
  getFiscalMode,
  setFiscalMode,
  calculateCartTotals,
  getParkedOrders,
  saveParkedOrder,
  removeParkedOrder
} from '@/services/posService'

// Component Imports
import POSHeader from './POSHeader'
import POSProductCatalog from './POSProductCatalog'
import POSCart from './POSCart'
import POSPaymentModal from './POSPaymentModal'
import POSParkedOrdersModal from './POSParkedOrdersModal'

const POSTerminalView = () => {
  // States
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [bcvRate, setBcvRateState] = useState(36.5)
  const [fiscalMode, setFiscalModeState] = useState(true)
  const [cart, setCart] = useState<POSCartItem[]>([])
  const [customer, setCustomer] = useState<POSCustomer>(defaultCustomer)
  const [parkedOrders, setParkedOrders] = useState<ParkedOrder[]>([])

  // Modal States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [parkedModalOpen, setParkedModalOpen] = useState(false)
  const [completedSaleModal, setCompletedSaleModal] = useState<any | null>(null)

  // Initialize
  useEffect(() => {
    const init = async () => {
      const prods = await getInventoryTemplates()

      setTemplates(prods)
      setBcvRateState(getBCVRate())
      setFiscalModeState(getFiscalMode())
      setParkedOrders(getParkedOrders())
    }

    init()
  }, [])

  const handleUpdateBCV = (newRate: number) => {
    setBcvRateState(newRate)
    setBCVRate(newRate)
  }

  const handleToggleFiscal = (fiscal: boolean) => {
    setFiscalModeState(fiscal)
    setFiscalMode(fiscal)
  }

  // Cart Totals
  const totals = useMemo(() => {
    return calculateCartTotals(cart, fiscalMode, bcvRate)
  }, [cart, fiscalMode, bcvRate])

  // Cart operations
  const handleAddToCart = (template: ProductTemplate, variant: ProductVariant) => {
    const existing = cart.find(i => i.variantId === variant.id)
    const unitPriceUSD = template.basePrice + variant.priceExtra

    const variantLabel =
      variant.combinationValues.length > 0
        ? variant.combinationValues.map(c => `${c.attributeName}: ${c.valueName}`).join(' · ')
        : undefined

    if (existing) {
      setCart(prev =>
        prev.map(item => {
          if (item.variantId === variant.id) {
            const newQty = item.quantity + 1

            return {
              ...item,
              quantity: newQty,
              totalUSD: newQty * item.unitPriceUSD,
              totalVES: newQty * item.unitPriceUSD * bcvRate
            }
          }

          return item
        })
      )
    } else {
      const newItem: POSCartItem = {
        id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        templateId: template.id,
        variantId: variant.id,
        name: template.name,
        variantLabel,
        sku: variant.sku,
        barcode: variant.barcode,
        uom: template.uomCode,
        quantity: 1,
        unitPriceUSD,
        costPriceUSD: variant.costPrice,
        vatRate: template.vatRate,
        totalUSD: unitPriceUSD,
        totalVES: unitPriceUSD * bcvRate
      }

      setCart(prev => [...prev, newItem])
    }
  }

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(cartItemId)

      return
    }

    setCart(prev =>
      prev.map(item => {
        if (item.id === cartItemId) {
          return {
            ...item,
            quantity: newQty,
            totalUSD: newQty * item.unitPriceUSD,
            totalVES: newQty * item.unitPriceUSD * bcvRate
          }
        }

        return item
      })
    )
  }

  const handleRemoveItem = (cartItemId: string) => {
    setCart(prev => prev.filter(i => i.id !== cartItemId))
  }

  const handleClearCart = () => {
    setCart([])
  }

  // Park Order
  const handleParkOrder = () => {
    if (cart.length === 0) return

    const newOrder: ParkedOrder = {
      id: `park-${Date.now()}`,
      code: `TICKET-#${Math.floor(100 + Math.random() * 900)}`,
      customer,
      items: [...cart],
      fiscalMode,
      createdAt: new Date().toISOString(),
      totalUSD: totals.totalUSD,
      totalVES: totals.totalVES
    }

    const updated = saveParkedOrder(newOrder)

    setParkedOrders(updated)
    setCart([])
    setCustomer(defaultCustomer)
  }

  const handleResumeOrder = (order: ParkedOrder) => {
    setCart(order.items)
    setCustomer(order.customer)
    setFiscalModeState(order.fiscalMode)
    const updated = removeParkedOrder(order.id)

    setParkedOrders(updated)
  }

  const handleDeleteParkedOrder = (orderId: string) => {
    const updated = removeParkedOrder(orderId)

    setParkedOrders(updated)
  }

  // Complete Sale
  const handleCompleteSale = (
    payments: POSPaymentRecord[],
    changeMethod?: ChangeResolutionType
  ) => {
    const saleRecord = {
      id: `SALE-${Date.now()}`,
      items: [...cart],
      customer,
      payments,
      totals,
      changeMethod,
      bcvRate,
      fiscalMode,
      date: new Date().toLocaleString()
    }

    setCompletedSaleModal(saleRecord)
    setCart([])
    setCustomer(defaultCustomer)
  }

  return (
    <div className='flex flex-col h-screen w-screen overflow-hidden bg-[var(--mui-palette-background-default)]'>
      {/* 1. Header */}
      <POSHeader
        cashierName='Francisco Maneiro'
        terminalName='Caja #01 (Principal)'
        bcvRate={bcvRate}
        onUpdateBCVRate={handleUpdateBCV}
        fiscalMode={fiscalMode}
        onToggleFiscalMode={handleToggleFiscal}
        parkedCount={parkedOrders.length}
        onOpenParkedModal={() => setParkedModalOpen(true)}
      />

      {/* 2. Main Terminal Content (Split Screen 65% Catalog / 35% Cart) */}
      <div className='grow flex overflow-hidden'>
        {/* Left: Product Catalog */}
        <div className='w-[60%] lg:w-[65%] h-full overflow-hidden'>
          <POSProductCatalog
            templates={templates}
            bcvRate={bcvRate}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* Right: Cart & Checkout */}
        <div className='w-[40%] lg:w-[35%] h-full overflow-hidden'>
          <POSCart
            items={cart}
            customer={customer}
            onUpdateCustomer={setCustomer}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onParkOrder={handleParkOrder}
            onCheckout={() => setPaymentModalOpen(true)}
            subtotalUSD={totals.subtotalUSD}
            subtotalVES={totals.subtotalVES}
            taxUSD={totals.taxUSD}
            taxVES={totals.taxVES}
            totalUSD={totals.totalUSD}
            totalVES={totals.totalVES}
            fiscalMode={fiscalMode}
          />
        </div>
      </div>

      {/* Payment Modal */}
      <POSPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        baseTotalUSD={totals.totalUSD}
        bcvRate={bcvRate}
        fiscalMode={fiscalMode}
        onCompleteSale={handleCompleteSale}
      />

      {/* Parked Orders Modal */}
      <POSParkedOrdersModal
        open={parkedModalOpen}
        onClose={() => setParkedModalOpen(false)}
        orders={parkedOrders}
        onResumeOrder={handleResumeOrder}
        onDeleteOrder={handleDeleteParkedOrder}
      />

      {/* Completed Sale Success Dialog */}
      <Dialog open={Boolean(completedSaleModal)} onClose={() => setCompletedSaleModal(null)} maxWidth='xs' fullWidth>
        <DialogTitle className='text-center pt-6'>
          <div className='inline-flex items-center justify-center is-14 bs-14 rounded-full bg-success/10 text-success mb-2'>
            <i className='tabler-circle-check text-4xl' />
          </div>
          <Typography variant='h5' className='font-bold'>
            ¡Venta Procesada con Éxito!
          </Typography>
        </DialogTitle>
        <DialogContent className='text-center pb-2'>
          <Typography variant='body2' className='text-textSecondary mb-3'>
            {completedSaleModal?.fiscalMode
              ? 'Factura fiscal emitida y enviada a la impresora homologada.'
              : 'Comprobante de nota de entrega generado correctamente.'}
          </Typography>
          <div className='p-3 rounded-xl bg-[var(--mui-palette-action-hover)] font-mono text-xs flex flex-col gap-1 text-left'>
            <div>Ticket: <strong>{completedSaleModal?.id}</strong></div>
            <div>Cliente: <strong>{completedSaleModal?.customer.name}</strong></div>
            <div>Total: <strong>${completedSaleModal?.totals.totalUSD.toFixed(2)} ({completedSaleModal?.totals.totalVES.toFixed(2)} Bs.)</strong></div>
            <div>Abonos: <strong>{completedSaleModal?.payments.length} métodos registrados</strong></div>
            {completedSaleModal?.changeMethod && (
              <div className='text-primary font-bold'>Vuelto Liquidado: {completedSaleModal.changeMethod}</div>
            )}
          </div>
        </DialogContent>
        <DialogActions className='justify-center pb-6'>
          <Button variant='contained' color='primary' onClick={() => setCompletedSaleModal(null)}>
            Listo para Siguiente Venta
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default POSTerminalView
