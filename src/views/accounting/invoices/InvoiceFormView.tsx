'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

import { accountingService } from '@/services/accountingService'
import { contactsService } from '@/services/contactsService'
import { salesQuotesService } from '@/services/salesQuotesService'
import { purchasesService } from '@/services/purchasesService'
import { getInventoryTemplates } from '@/services/inventoryService'
import { settingsService } from '@/services/settingsService'
import { calculateBillableSalesLines, calculateBillablePurchaseLines } from '@/utils/policyEngine'
import type {
  Account,
  AccountingInvoice,
  InvoiceAccountingType,
  InvoiceDocumentType,
  InvoiceLine,
  JournalItem,
  CurrencyCode,
  Payment
} from '@/types/accountingTypes'
import { AutomaticEntryPreview } from './components/AutomaticEntryPreview'
import { RegisterInvoicePaymentModal } from './components/RegisterInvoicePaymentModal'
import { CancelInvoiceModal } from './components/CancelInvoiceModal'
import { CreateCreditNoteModal } from './components/CreateCreditNoteModal'

interface ProductSuggestion {
  nombre: string
  cuentaId: string
  precioUnitario: number
  tipo: 'CUSTOMER' | 'SUPPLIER'
}

const CATALOG_PRODUCT_SUGGESTIONS: ProductSuggestion[] = [
  // Clientes / Ventas (Ingresos)
  { nombre: 'Servicio de Consultoría y Asesoría Técnica', cuentaId: 'acc-410101', precioUnitario: 250.00, tipo: 'CUSTOMER' },
  { nombre: 'Venta de Mercancía / Productos Terminados', cuentaId: 'acc-410101', precioUnitario: 120.00, tipo: 'CUSTOMER' },
  { nombre: 'Servicio de Soporte y Mantenimiento de Software', cuentaId: 'acc-410102', precioUnitario: 180.00, tipo: 'CUSTOMER' },
  { nombre: 'Licenciamiento Anual Plataforma SaaS', cuentaId: 'acc-410102', precioUnitario: 450.00, tipo: 'CUSTOMER' },
  { nombre: 'Servicio de Capacitación y Adiestramiento', cuentaId: 'acc-410101', precioUnitario: 150.00, tipo: 'CUSTOMER' },
  { nombre: 'Ingresos por Fletes y Envíos Nacionales', cuentaId: 'acc-410101', precioUnitario: 85.00, tipo: 'CUSTOMER' },
  // Proveedores / Compras (Gastos / Costos / Activos)
  { nombre: 'Servicio de Electricidad / Corpoelec Mes en Curso', cuentaId: 'acc-610103', precioUnitario: 150.00, tipo: 'SUPPLIER' },
  { nombre: 'Alquiler Mensual de Galpón / Oficinas Comerciales', cuentaId: 'acc-610102', precioUnitario: 650.00, tipo: 'SUPPLIER' },
  { nombre: 'Servicio de Internet y Telecomunicaciones Fibra Óptica', cuentaId: 'acc-610103', precioUnitario: 80.00, tipo: 'SUPPLIER' },
  { nombre: 'Compra de Materiales y Suministros de Oficina', cuentaId: 'acc-610104', precioUnitario: 45.00, tipo: 'SUPPLIER' },
  { nombre: 'Servicio de Mantenimiento y Reparación de Equipos', cuentaId: 'acc-610105', precioUnitario: 120.00, tipo: 'SUPPLIER' },
  { nombre: 'Compra de Inventario / Mercancía para la Venta', cuentaId: 'acc-110301', precioUnitario: 300.00, tipo: 'SUPPLIER' },
  { nombre: 'Honorarios Profesionales Contables y Jurídicos', cuentaId: 'acc-610101', precioUnitario: 200.00, tipo: 'SUPPLIER' }
];

interface Props {
  onBack: () => void
  onSaved: (invoice: AccountingInvoice) => void
  onInvoiceUpdated?: (invoice: AccountingInvoice) => void
  invoice?: AccountingInvoice | null
  initialType?: InvoiceAccountingType
  createFromQuoteId?: string
  createFromPurchaseId?: string
  accounts: Account[]
  defaultTasaBcv?: number
}

// Contact seeds for selection
const CONTACT_OPTIONS = [
  { id: 'ct-prov-01', nombre: 'Corpoelec / Servicios Eléctricos', rif: 'G-20003001-0', tipo: 'SUPPLIER', cuentaCxpId: 'acc-210101' },
  { id: 'ct-prov-02', nombre: 'Distribuidora Eléctrica del Sur C.A.', rif: 'J-40128456-0', tipo: 'SUPPLIER', cuentaCxpId: 'acc-210101' },
  { id: 'ct-prov-03', nombre: 'Inmobiliaria Los Próceres (Alquiler Galpón)', rif: 'J-31092834-4', tipo: 'SUPPLIER', cuentaCxpId: 'acc-210101' },
  { id: 'ct-prov-04', nombre: 'Cantv / Internet y Telecomunicaciones', rif: 'G-20001099-2', tipo: 'SUPPLIER', cuentaCxpId: 'acc-210101' },
  { id: 'ct-prov-05', nombre: 'Ferretería Industrial Roscio C.A.', rif: 'J-31456789-1', tipo: 'SUPPLIER', cuentaCxpId: 'acc-210101' },
  { id: 'ct-01', nombre: 'Inversiones Caroní C.A.', rif: 'J-30981245-2', tipo: 'CUSTOMER', cuentaCxcId: 'acc-110201' },
  { id: 'ct-02', nombre: 'Distribuidora Oriental S.A.S.', rif: 'J-40291823-1', tipo: 'CUSTOMER', cuentaCxcId: 'acc-110201' },
  { id: 'ct-03', nombre: 'Corporación Metalmecánica Bolivariana', rif: 'J-31890234-5', tipo: 'CUSTOMER', cuentaCxcId: 'acc-110201' }
]

export const InvoiceFormView: React.FC<Props> = ({
  onBack,
  onSaved,
  onInvoiceUpdated,
  invoice,
  initialType = 'SUPPLIER',
  createFromQuoteId,
  createFromPurchaseId,
  accounts,
  defaultTasaBcv = 54.00
}) => {
  // Current active invoice in state (allows real-time updates when payments are registered)
  const [currentInvoice, setCurrentInvoice] = useState<AccountingInvoice | null>(invoice || null)
  const isEditing = Boolean(currentInvoice?.id)

  // Inmutabilidad estilo Odoo: Si la factura está Publicada, Pagada, Anulada o Revertida, está bloqueada para edición
  // Para modificar contacto, líneas, montos, etc., se debe pulsar "Restablecer a Borrador"
  const isReadOnly =
    currentInvoice?.estado === 'POSTED' ||
    currentInvoice?.estado === 'PAID' ||
    currentInvoice?.estado === 'CANCELED' ||
    currentInvoice?.estado === 'REVERSED'
  const [resettingDraft, setResettingDraft] = useState(false)

  const [activeTab, setActiveTab] = useState<number>(0)
  const [tipo, setTipo] = useState<InvoiceAccountingType>(currentInvoice?.tipo || initialType)
  const [tipoDocumento, setTipoDocumento] = useState<InvoiceDocumentType>(
    currentInvoice?.tipoDocumento || 'FACTURA'
  )
  const [moneda, setMoneda] = useState<CurrencyCode>(currentInvoice?.moneda || 'USD')

  const [numeroFactura, setNumeroFactura] = useState(
    currentInvoice?.numeroFactura ||
      `${tipo === 'SUPPLIER' ? 'FAC-PROV' : 'INV'}-2026-${Math.floor(1000 + Math.random() * 9000)}`
  )

  const [dynamicContacts, setDynamicContacts] = useState<typeof CONTACT_OPTIONS>(CONTACT_OPTIONS)

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const [terceros, configs] = await Promise.all([
          contactsService.getTerceros(),
          accountingService.getContactAccountingConfigs()
        ])

        const mapped: typeof CONTACT_OPTIONS = []

        terceros.forEach(t => {
          const cfg = configs.find(c => c.contactoId === t.id || c.contactoRif === t.identificacion)
          if (t.is_cliente) {
            mapped.push({
              id: t.id,
              nombre: t.nombre_razon_social,
              rif: t.identificacion,
              tipo: 'CUSTOMER',
              cuentaCxcId: t.cuenta_cxc_id || cfg?.cuentaCxcId || 'acc-110201'
            })
          }
          if (t.is_proveedor) {
            mapped.push({
              id: t.id,
              nombre: t.nombre_razon_social,
              rif: t.identificacion,
              tipo: 'SUPPLIER',
              cuentaCxpId: t.cuenta_cxp_id || cfg?.cuentaCxpId || 'acc-210101'
            })
          }
        })

        const combined = [...mapped]
        CONTACT_OPTIONS.forEach(seed => {
          if (!combined.some(c => c.id === seed.id && c.tipo === seed.tipo)) {
            combined.push(seed)
          }
        })

        setDynamicContacts(combined)
      } catch (err) {
        console.error('Error fetching dynamic contacts:', err)
      }
    }

    fetchContacts()
  }, [])

  const defaultContact =
    dynamicContacts.find(c => c.tipo === (currentInvoice?.tipo || initialType)) || dynamicContacts[0]
  const [contactoId, setContactoId] = useState(currentInvoice?.contactoId || defaultContact.id)
  const [tasaBcv, setTasaBcv] = useState<number>(currentInvoice?.tasaBcv || defaultTasaBcv)
  const [fechaEmision, setFechaEmision] = useState(
    currentInvoice?.fechaEmision || new Date().toISOString().split('T')[0]
  )
  const [fechaVencimiento, setFechaVencimiento] = useState(
    currentInvoice?.fechaVencimiento ||
      new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  )

  // Default lines: If supplier/expense, show expense concept
  const defaultLine: InvoiceLine =
    tipo === 'SUPPLIER'
      ? {
          id: 'lin-1',
          productoOConcepto: 'Servicio de Electricidad / Servicios Públicos Mes Actual',
          cuentaContableId: 'acc-610103', // Servicios Públicos
          cantidad: 1,
          precioUnitarioUsd: 150.0,
          tasaImpuestoPct: 16,
          subtotalUsd: 150.0,
          ivaUsd: 24.0,
          totalUsd: 174.0
        }
      : {
          id: 'lin-1',
          productoOConcepto: 'Servicio de Consultoría / Mercancía General',
          cuentaContableId: 'acc-410101', // Ingresos por Venta
          cantidad: 1,
          precioUnitarioUsd: 200.0,
          tasaImpuestoPct: 16,
          subtotalUsd: 200.0,
          ivaUsd: 32.0,
          totalUsd: 232.0
        }

  const [lineas, setLineas] = useState<InvoiceLine[]>(currentInvoice?.lineas || [defaultLine])

  const defaultTerms =
    tipo === 'CUSTOMER'
      ? 'Condiciones de pago: Crédito comercial a 15 días continuos.\nPagos en bolívares calculados a la tasa oficial BCV a la fecha del abono.\nCuentas bancarias receptoras: Banesco Banco Universal (Cta. Corriente 0134-0012-34-5678901234 a nombre de la empresa).'
      : 'Gasto directo / Factura de proveedor recibida para trámite de pago.\nRetenciones de IVA y pagos aplicados conforme al calendario fiscal vigente.'

  const [terminosCondiciones, setTerminosCondiciones] = useState<string>(
    currentInvoice?.terminosCondiciones || defaultTerms
  )

  // Documento Origen y Trazabilidad (SPEC-009)
  const [documentoOrigen, setDocumentoOrigen] = useState<string>(currentInvoice?.documentoOrigen || '')
  const [origenQuoteId, setOrigenQuoteId] = useState<string | undefined>(currentInvoice?.origenQuoteId)
  const [origenPurchaseId, setOrigenPurchaseId] = useState<string | undefined>(currentInvoice?.origenPurchaseId)
  const [originPreloadNotice, setOriginPreloadNotice] = useState<string | null>(null)

  // Payment and Action Modal States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [creditNoteModalOpen, setCreditNoteModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (invoice) {
      setCurrentInvoice(invoice)
      setTipo(invoice.tipo)
      setTipoDocumento(invoice.tipoDocumento || 'FACTURA')
      setMoneda(invoice.moneda || 'USD')
      setNumeroFactura(invoice.numeroFactura)
      setContactoId(invoice.contactoId)
      setTasaBcv(invoice.tasaBcv)
      setFechaEmision(invoice.fechaEmision)
      setFechaVencimiento(invoice.fechaVencimiento)
      setLineas(invoice.lineas)
      setDocumentoOrigen(invoice.documentoOrigen || '')
      setOrigenQuoteId(invoice.origenQuoteId)
      setOrigenPurchaseId(invoice.origenPurchaseId)
      setTerminosCondiciones(invoice.terminosCondiciones || defaultTerms)
    } else {
      setTipo(initialType)
      const contactForType = CONTACT_OPTIONS.find(c => c.tipo === initialType) || CONTACT_OPTIONS[0]

      setContactoId(contactForType.id)
      setNumeroFactura(
        `${initialType === 'SUPPLIER' ? 'FAC-PROV' : 'INV'}-2026-${Math.floor(1000 + Math.random() * 9000)}`
      )
      setTasaBcv(defaultTasaBcv)
      setTerminosCondiciones(
        initialType === 'CUSTOMER'
          ? 'Condiciones de pago: Crédito comercial a 15 días continuos.\nPagos en bolívares calculados a la tasa oficial BCV a la fecha del abono.\nCuentas bancarias receptoras: Banesco Banco Universal (Cta. Corriente 0134-0012-34-5678901234 a nombre de la empresa).'
          : 'Gasto directo / Factura de proveedor recibida para trámite de pago.\nRetenciones de IVA y pagos aplicados conforme al calendario fiscal vigente.'
      )
    }
  }, [invoice, initialType, defaultTasaBcv])

  // Precarga automática desde Cotización o Compra (SPEC-009)
  useEffect(() => {
    if (isEditing) return

    if (createFromQuoteId) {
      const loadQuoteContext = async () => {
        try {
          const [quote, products, policies] = await Promise.all([
            salesQuotesService.getQuoteById(createFromQuoteId),
            getInventoryTemplates(),
            settingsService.getCommercialPolicies()
          ])

          if (quote) {
            setTipo('CUSTOMER')
            setMoneda(quote.moneda_base)
            setTasaBcv(quote.tasa_bcv.tasa)
            const originDoc = quote.correlativo_orden || quote.correlativo
            setDocumentoOrigen(originDoc)
            setOrigenQuoteId(quote.id)

            // Buscar o agregar cliente a dynamicContacts
            const foundContact = dynamicContacts.find(
              c =>
                c.rif.toLowerCase() === quote.cliente.identificacion.toLowerCase() ||
                c.id === quote.cliente.id
            )
            if (foundContact) {
              setContactoId(foundContact.id)
            } else {
              const newC = {
                id: quote.cliente.id,
                nombre: quote.cliente.nombre_razon_social,
                rif: quote.cliente.identificacion,
                tipo: 'CUSTOMER' as const,
                cuentaCxcId: 'acc-110201'
              }
              setDynamicContacts(prev => [newC, ...prev])
              setContactoId(newC.id)
            }

            // Filtrar líneas facturables según política
            const billableLines = calculateBillableSalesLines(quote, products, policies)
            const activeLines = billableLines.filter(b => b.billableQty > 0)

            if (activeLines.length > 0) {
              const mappedLines: InvoiceLine[] = activeLines.map((b, idx) => {
                const subtotal = b.billableQty * b.line.precio_unitario
                const vatRate = !quote.aplica_iva || b.line.alicuota_iva === 'EXEMPT' || b.line.alicuota_iva === '0' ? 0 : 16
                const iva = subtotal * (vatRate / 100)
                return {
                  id: `lin-${Date.now()}-${idx + 1}`,
                  productoOConcepto: b.line.producto_nombre,
                  cuentaContableId: 'acc-410101', // Ingresos por Ventas
                  cuentaContableNombre: 'Ventas de Mercancía / Ingresos Operacionales',
                  cantidad: b.billableQty,
                  precioUnitarioUsd: b.line.precio_unitario,
                  tasaImpuestoPct: vatRate,
                  subtotalUsd: Number(subtotal.toFixed(2)),
                  ivaUsd: Number(iva.toFixed(2)),
                  totalUsd: Number((subtotal + iva).toFixed(2))
                }
              })
              setLineas(mappedLines)
            }

            setOriginPreloadNotice(
              `Factura precargada automáticamente a partir del pedido de venta ${originDoc}. Se aplicaron las cantidades facturables según las políticas comerciales de cada producto.`
            )
          }
        } catch (err) {
          console.error('Error preloading quote context:', err)
        }
      }
      loadQuoteContext()
    } else if (createFromPurchaseId) {
      const loadPurchaseContext = async () => {
        try {
          const [purchase, products, policies] = await Promise.all([
            purchasesService.getPurchaseQuoteById(createFromPurchaseId),
            getInventoryTemplates(),
            settingsService.getCommercialPolicies()
          ])

          if (purchase) {
            setTipo('SUPPLIER')
            setMoneda(purchase.moneda_base)
            setTasaBcv(purchase.tasa_bcv.tasa)
            const originDoc = purchase.correlativo_orden_compra || purchase.correlativo
            setDocumentoOrigen(originDoc)
            setOrigenPurchaseId(purchase.id)

            // Buscar o agregar proveedor a dynamicContacts
            const foundContact = dynamicContacts.find(
              c =>
                c.rif.toLowerCase() === purchase.proveedor.identificacion.toLowerCase() ||
                c.id === purchase.proveedor.id
            )
            if (foundContact) {
              setContactoId(foundContact.id)
            } else {
              const newC = {
                id: purchase.proveedor.id,
                nombre: purchase.proveedor.razon_social,
                rif: purchase.proveedor.identificacion,
                tipo: 'SUPPLIER' as const,
                cuentaCxpId: 'acc-210101'
              }
              setDynamicContacts(prev => [newC, ...prev])
              setContactoId(newC.id)
            }

            // Filtrar líneas facturables según política de control de compra
            const billableLines = calculateBillablePurchaseLines(purchase, products, policies)
            const activeLines = billableLines.filter(b => b.billableQty > 0)

            if (activeLines.length > 0) {
              const mappedLines: InvoiceLine[] = activeLines.map((b, idx) => {
                const subtotal = b.billableQty * b.line.costo_unitario
                const vatRate = !purchase.aplica_iva_compras || b.line.alicuota_iva === 'EXEMPT' || b.line.alicuota_iva === '0' ? 0 : 16
                const iva = subtotal * (vatRate / 100)
                return {
                  id: `lin-${Date.now()}-${idx + 1}`,
                  productoOConcepto: b.line.producto_nombre,
                  cuentaContableId: b.line.is_physical_stock ? 'acc-110301' : 'acc-510101',
                  cuentaContableNombre: b.line.is_physical_stock ? 'Inventario de Mercancía' : 'Costo de Ventas / Gastos Operativos',
                  cantidad: b.billableQty,
                  precioUnitarioUsd: b.line.costo_unitario,
                  tasaImpuestoPct: vatRate,
                  subtotalUsd: Number(subtotal.toFixed(2)),
                  ivaUsd: Number(iva.toFixed(2)),
                  totalUsd: Number((subtotal + iva).toFixed(2))
                }
              })
              setLineas(mappedLines)
            }

            setOriginPreloadNotice(
              `Factura de proveedor precargada a partir de la orden de compra ${originDoc}. Se aplicaron las cantidades facturables según las políticas de recepción de almacén.`
            )
          }
        } catch (err) {
          console.error('Error preloading purchase context:', err)
        }
      }
      loadPurchaseContext()
    }
  }, [createFromQuoteId, createFromPurchaseId, isEditing])

  // Current selected contact
  const currentContact = useMemo(() => {
    return dynamicContacts.find(c => c.id === contactoId) || dynamicContacts[0]
  }, [dynamicContacts, contactoId])

  // Cuentas contables autorizadas por tipo de comprobante (Estilo Odoo):
  // Factura de Cliente (Ventas): Únicamente Cuentas de Ingresos (4.x)
  // Factura de Proveedor (Compras/Gastos): Gastos Operativos (6.x), Costo de Ventas (5.x) y Activos de Compra/Inventario (1.2.x / 1.1.03)
  const eligibleAccounts = useMemo(() => {
    if (tipo === 'CUSTOMER') {
      return accounts.filter(a => a.tipo.startsWith('INCOME'))
    }

    return accounts.filter(
      a =>
        a.tipo.startsWith('EXPENSE') ||
        a.tipo === 'COST_OF_GOODS' ||
        a.tipo.startsWith('ASSET_NON_CURRENT') ||
        a.codigo === '1.1.03.01' // Inventario de Mercancía
    )
  }, [accounts, tipo])

  // Restablecer a Borrador estilo Odoo: Permite desbloquear la factura para corregir cliente, líneas y montos
  const handleResetToDraft = async () => {
    if (!currentInvoice?.id) return

    if (currentInvoice.pagosAsociados && currentInvoice.pagosAsociados.length > 0) {
      setToastMessage('No se puede pasar a borrador: la factura ya posee pagos o cobros conciliados.')

      return
    }

    try {
      setResettingDraft(true)
      const updated = await accountingService.resetInvoiceToDraft(currentInvoice.id)

      setCurrentInvoice(updated)
      if (onInvoiceUpdated) {
        onInvoiceUpdated(updated)
      }
      setToastMessage(`Factura ${updated.numeroFactura} restablecida a Borrador. Ahora puedes modificarla libremente en esta pantalla.`)
    } catch (err: any) {
      setToastMessage(err?.message || 'Error al restablecer a borrador.')
    } finally {
      setResettingDraft(false)
    }
  }

  // Handle line changes
  const handleLineChange = (index: number, field: keyof InvoiceLine, value: any) => {
    setLineas(prev => {
      const updated = [...prev]
      const current = { ...updated[index], [field]: value }

      if (field === 'cantidad' || field === 'precioUnitarioUsd' || field === 'tasaImpuestoPct') {
        const qty = Number(current.cantidad) || 0
        const price = Number(current.precioUnitarioUsd) || 0
        const taxRate = Number(current.tasaImpuestoPct) || 0

        current.subtotalUsd = Number((qty * price).toFixed(2))
        current.ivaUsd = Number(((current.subtotalUsd * taxRate) / 100).toFixed(2))
        current.totalUsd = Number((current.subtotalUsd + current.ivaUsd).toFixed(2))
      }

      updated[index] = current

      return updated
    })
  }

  const handleAddLine = () => {
    const defaultAccount = tipo === 'SUPPLIER' ? 'acc-610103' : 'acc-410101'

    setLineas(prev => [
      ...prev,
      {
        id: `lin-${Date.now()}`,
        productoOConcepto: tipo === 'SUPPLIER' ? 'Concepto de Gasto Directo' : 'Producto o Servicio',
        cuentaContableId: defaultAccount,
        cantidad: 1,
        precioUnitarioUsd: 50.0,
        tasaImpuestoPct: 16,
        subtotalUsd: 50.0,
        ivaUsd: 8.0,
        totalUsd: 58.0
      }
    ])
  }

  const handleRemoveLine = (index: number) => {
    if (lineas.length <= 1) return
    setLineas(prev => prev.filter((_, i) => i !== index))
  }

  // Calculations
  const totalNetoUsd = useMemo(() => lineas.reduce((acc, l) => acc + l.subtotalUsd, 0), [lineas])
  const totalIvaUsd = useMemo(() => lineas.reduce((acc, l) => acc + l.ivaUsd, 0), [lineas])
  const totalUsd = Number((totalNetoUsd + totalIvaUsd).toFixed(2))
  const totalVes = Number((totalUsd * tasaBcv).toFixed(2))

  // Real-time automatic entry preview
  const entryPreviewItems: JournalItem[] = useMemo(() => {
    const contactoCuentaId =
      tipo === 'CUSTOMER'
        ? currentContact.cuentaCxcId || 'acc-110201'
        : currentContact.cuentaCxpId || 'acc-210101'

    return accountingService.generateInvoicePreviewEntry(
      {
        tipo,
        numeroFactura,
        contactoId: currentContact.id,
        contactoNombre: currentContact.nombre,
        contactoCuentaContableId: contactoCuentaId,
        tasaBcv,
        lineas
      },
      accounts
    )
  }, [tipo, numeroFactura, currentContact, tasaBcv, lineas, accounts])

  // Payment Tracking (Odoo Style)
  const pagosAsociados = currentInvoice?.pagosAsociados || []
  const totalPagadoUsd = pagosAsociados.reduce((acc, p) => acc + (p.montoUsd || 0), 0)
  const totalPagadoVes = pagosAsociados.reduce((acc, p) => acc + (p.montoVes || 0), 0)

  const saldoPendienteUsd =
    currentInvoice?.saldoPendienteUsd !== undefined
      ? currentInvoice.saldoPendienteUsd
      : totalUsd
  const saldoPendienteVes =
    currentInvoice?.saldoPendienteVes !== undefined
      ? currentInvoice.saldoPendienteVes
      : totalVes

  const totalNcAplicadasUsd = (currentInvoice?.notasCreditoAplicadas || []).reduce((acc, nc) => acc + (nc.montoUsd || 0), 0)
  const isFullyReversed =
    currentInvoice?.estado === 'REVERSED' ||
    (totalNcAplicadasUsd >= (totalUsd - 0.01) && totalNcAplicadasUsd > 0)

  const isFullyPaid =
    !isFullyReversed &&
    (currentInvoice?.estado === 'PAID' || (saldoPendienteUsd <= 0.01 && pagosAsociados.length > 0))
  const isPartiallyPaid = !isFullyReversed && pagosAsociados.length > 0 && !isFullyPaid

  // Save handler
  const handleSave = async (postDirectly: boolean) => {
    const contactoCuentaId =
      tipo === 'CUSTOMER'
        ? currentContact.cuentaCxcId || 'acc-110201'
        : currentContact.cuentaCxpId || 'acc-210101'

    const targetId = currentInvoice?.id || `inv-${Date.now()}`

    const newInvoice: AccountingInvoice = {
      id: targetId,
      numeroFactura,
      tipo,
      tipoDocumento,
      moneda,
      diarioId: tipo === 'CUSTOMER' ? 'jou-sales' : 'jou-purchases',
      contactoId: currentContact.id,
      contactoNombre: currentContact.nombre,
      contactoRif: currentContact.rif,
      contactoCuentaContableId: contactoCuentaId,
      fechaEmision,
      fechaVencimiento,
      tasaBcv,
      estado: postDirectly ? 'POSTED' : 'DRAFT',
      lineas,
      totalNetoUsd,
      totalIvaUsd,
      totalUsd,
      totalVes,
      saldoPendienteUsd: currentInvoice?.saldoPendienteUsd ?? totalUsd,
      saldoPendienteVes: currentInvoice?.saldoPendienteVes ?? totalVes,
      documentoOrigen: documentoOrigen.trim() || undefined,
      origenQuoteId,
      origenPurchaseId,
      terminosCondiciones,
      pagosAsociados: currentInvoice?.pagosAsociados || []
    }

    if (postDirectly) {
      await accountingService.createJournalEntry({
        diarioId: tipo === 'CUSTOMER' ? 'jou-sales' : 'jou-purchases',
        fecha: fechaEmision,
        origen: 'FACTURA',
        documentoReferencia: numeroFactura,
        tasaBcv,
        creadoPor: 'Módulo de Contabilidad',
        lineas: entryPreviewItems
      })
    }

    // Persist in service
    if (currentInvoice?.id) {
      await accountingService.updateInvoice(currentInvoice.id, newInvoice)
    } else {
      await accountingService.createInvoice(newInvoice)
    }

    setCurrentInvoice(newInvoice)
    onSaved(newInvoice)
    onBack()
  }

  // Handle payment success
  const handlePaymentSuccess = (updatedInvoice: AccountingInvoice, payment: Payment) => {
    setCurrentInvoice(updatedInvoice)
    onSaved(updatedInvoice)
    setToastMessage(`Pago ${payment.numeroPago} registrado y conciliado con éxito.`)
  }

  // Handle invoice cancellation success
  const handleCancelSuccess = (canceledInvoice: AccountingInvoice) => {
    setCurrentInvoice(canceledInvoice)
    if (onInvoiceUpdated) {
      onInvoiceUpdated(canceledInvoice)
    }
    setToastMessage(`Factura ${canceledInvoice.numeroFactura} anulada con éxito.`)
  }

  // Handle credit note creation success
  const handleCreditNoteSuccess = (creditNote: AccountingInvoice, updatedInvoice: AccountingInvoice) => {
    setCurrentInvoice(updatedInvoice)
    if (onInvoiceUpdated) {
      onInvoiceUpdated(updatedInvoice)
    }
    setToastMessage(`Nota de Crédito ${creditNote.numeroFactura} emitida y aplicada a la factura con éxito.`)
  }

  const isSupplier = tipo === 'SUPPLIER'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Botón de Retorno y Cabecera de la Vista Completa */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Tooltip title='Volver al listado'>
            <IconButton
              onClick={onBack}
              sx={{
                width: 38,
                height: 38,
                borderRadius: '9999px',
                color: '#6B7280',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E6E4F0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                '&:hover': { color: '#6C5CE7', backgroundColor: '#F0EEF9', borderColor: '#6C5CE7' }
              }}
            >
              <i className='tabler-arrow-left text-lg' />
            </IconButton>
          </Tooltip>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E293B' }}>
                {isEditing
                  ? `${tipoDocumento === 'FACTURA' ? 'Factura' : tipoDocumento === 'NOTA_ENTREGA' ? 'Nota de Entrega' : tipoDocumento === 'NOTA_CREDITO' ? 'Nota de Crédito' : tipoDocumento === 'NOTA_DEBITO' ? 'Nota de Débito' : 'Recibo'} ${numeroFactura}`
                  : isSupplier
                    ? `Nueva Factura de Proveedor (${tipoDocumento})`
                    : `Nueva Factura de Cliente (${tipoDocumento})`}
              </Typography>

              {/* Sello de Pago o Estado estilo Odoo */}
              {currentInvoice?.estado === 'CANCELED' ? (
                <Chip
                  label='ANULADA'
                  size='medium'
                  sx={{
                    fontWeight: 900,
                    letterSpacing: '1px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#EF4444',
                    border: '2px solid #EF4444',
                    px: 1
                  }}
                />
              ) : isFullyReversed ? (
                <Chip
                  label='REVERTIDA'
                  size='medium'
                  sx={{
                    fontWeight: 900,
                    letterSpacing: '1px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(108, 92, 231, 0.15)',
                    color: '#6C5CE7',
                    border: '2px solid #6C5CE7',
                    px: 1
                  }}
                />
              ) : currentInvoice?.tipoDocumento === 'NOTA_CREDITO' ? (
                <Chip
                  label='NOTA DE CRÉDITO'
                  size='medium'
                  sx={{
                    fontWeight: 800,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(108, 92, 231, 0.15)',
                    color: '#6C5CE7',
                    border: '1px solid #6C5CE7',
                    px: 1
                  }}
                />
              ) : isFullyPaid ? (
                <Chip
                  label='PAGADA'
                  size='medium'
                  sx={{
                    fontWeight: 900,
                    letterSpacing: '1px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(108, 185, 129, 0.15)',
                    color: '#10B981',
                    border: '2px solid #10B981',
                    px: 1
                  }}
                />
              ) : isPartiallyPaid ? (
                <Chip
                  label='ABONADA PARCIAL'
                  size='medium'
                  sx={{
                    fontWeight: 800,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#D97706',
                    border: '1px solid #F59E0B'
                  }}
                />
              ) : currentInvoice?.estado === 'POSTED' ? (
                <Chip
                  label='Publicada'
                  size='medium'
                  sx={{
                    fontWeight: 700,
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(108, 92, 231, 0.12)',
                    color: '#6C5CE7'
                  }}
                />
              ) : (
                <Chip
                  label='Borrador'
                  size='medium'
                  sx={{
                    fontWeight: 700,
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(148, 163, 184, 0.15)',
                    color: '#64748B'
                  }}
                />
              )}
            </Box>
            <Typography variant='body2' sx={{ color: '#64748B' }}>
              {isSupplier
                ? 'Control de gastos de compras, suministros y servicios públicos con imputación contable directa'
                : 'Facturación comercial con doble partida automática, partida bimonetaria y conciliación de cobros'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {/* Botones Minimalistas de Guardar (Estilo Ícono Disquete) */}
          {!isReadOnly && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Tooltip title='Guardar Borrador'>
                <IconButton
                  onClick={() => handleSave(false)}
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: '9999px',
                    color: '#6B7280',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E6E4F0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    '&:hover': { color: '#6C5CE7', backgroundColor: '#F0EEF9', borderColor: '#6C5CE7' }
                  }}
                >
                  <i className='tabler-device-floppy text-lg' />
                </IconButton>
              </Tooltip>

              <Tooltip title='Confirmar y Publicar Factura'>
                <IconButton
                  onClick={() => handleSave(true)}
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: '9999px',
                    backgroundColor: '#6C5CE7',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 12px rgba(108, 92, 231, 0.3)',
                    '&:hover': { backgroundColor: '#5B4CDB' }
                  }}
                >
                  <i className='tabler-check text-lg' />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Botón Restablecer a Borrador estilo Odoo */}
          {currentInvoice?.estado === 'POSTED' && (
            <Button
              variant='outlined'
              size='small'
              startIcon={<i className='tabler-rotate-2' />}
              onClick={handleResetToDraft}
              disabled={resettingDraft}
              sx={{
                borderRadius: '9999px',
                borderColor: '#F59E0B',
                color: '#D97706',
                fontWeight: 700,
                textTransform: 'none',
                px: 2.5,
                '&:hover': {
                  borderColor: '#D97706',
                  backgroundColor: 'rgba(245, 158, 11, 0.08)'
                }
              }}
            >
              {resettingDraft ? 'Restableciendo...' : 'Restablecer a Borrador'}
            </Button>
          )}

          {/* Botón Emitir Nota de Crédito */}
          {currentInvoice && currentInvoice.estado !== 'DRAFT' && currentInvoice.estado !== 'CANCELED' && currentInvoice.estado !== 'REVERSED' && !isFullyReversed && currentInvoice.tipoDocumento !== 'NOTA_CREDITO' && (
            <Button
              variant='outlined'
              size='small'
              startIcon={<i className='tabler-receipt-refund' />}
              onClick={() => setCreditNoteModalOpen(true)}
              sx={{
                borderRadius: '9999px',
                borderColor: '#6C5CE7',
                color: '#6C5CE7',
                fontWeight: 700,
                textTransform: 'none',
                px: 2.5,
                '&:hover': {
                  borderColor: '#5B4CDB',
                  backgroundColor: 'rgba(108, 92, 231, 0.08)'
                }
              }}
            >
              Nota de Crédito
            </Button>
          )}

          {/* Botón Anular Factura */}
          {currentInvoice && currentInvoice.estado !== 'CANCELED' && currentInvoice.estado !== 'REVERSED' && !isFullyReversed && currentInvoice.tipoDocumento !== 'NOTA_CREDITO' && (
            <Button
              variant='outlined'
              size='small'
              startIcon={<i className='tabler-ban' />}
              onClick={() => setCancelModalOpen(true)}
              sx={{
                borderRadius: '9999px',
                borderColor: '#EF4444',
                color: '#EF4444',
                fontWeight: 700,
                textTransform: 'none',
                px: 2.5,
                '&:hover': {
                  borderColor: '#DC2626',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)'
                }
              }}
            >
              Anular
            </Button>
          )}

          {/* Botón Destacado: Registrar Pago (Estilo Odoo) */}
          {currentInvoice && currentInvoice.estado !== 'DRAFT' && currentInvoice.estado !== 'CANCELED' && currentInvoice.estado !== 'REVERSED' && !isFullyReversed && saldoPendienteUsd > 0.01 && (
            <Button
              variant='contained'
              startIcon={<i className='tabler-cash' />}
              onClick={() => setPaymentModalOpen(true)}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#10B981',
                fontWeight: 700,
                textTransform: 'none',
                px: 3,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                '&:hover': { backgroundColor: '#059669' }
              }}
            >
              {isSupplier ? 'Registrar Pago' : 'Registrar Cobro'}
            </Button>
          )}

          <Chip
            label={`Tasa BCV: ${tasaBcv.toFixed(2)} Bs/USD`}
            size='medium'
            sx={{
              fontWeight: 700,
              borderRadius: '9999px',
              backgroundColor: 'rgba(108, 92, 231, 0.1)',
              color: '#6C5CE7'
            }}
          />
        </Box>
      </Box>

      {/* Banner de Precarga de Documento Origen (SPEC-009) */}
      {originPreloadNotice && (
        <Alert
          severity='info'
          variant='filled'
          icon={<i className='tabler-link text-lg text-white' />}
          onClose={() => setOriginPreloadNotice(null)}
          sx={{
            borderRadius: '16px',
            backgroundColor: '#6C5CE7',
            color: '#FFFFFF',
            fontWeight: 500,
            boxShadow: '0 4px 14px rgba(108, 92, 231, 0.25)'
          }}
        >
          {originPreloadNotice}
        </Alert>
      )}

      {/* Banner de Factura Anulada */}
      {currentInvoice?.estado === 'CANCELED' && (
        <Alert
          severity='error'
          icon={<i className='tabler-ban text-lg' />}
          sx={{
            borderRadius: '16px',
            backgroundColor: '#FEF2F2',
            color: '#991B1B',
            border: '1px solid #FEE2E2',
            fontWeight: 500,
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.1)'
          }}
        >
          <strong>Factura Anulada:</strong> {currentInvoice.motivoAnulacion || 'Documento anulado'}.
          {currentInvoice.anuladaEn && ` Anulada el ${currentInvoice.anuladaEn}`}
          {currentInvoice.anuladaPor && ` por ${currentInvoice.anuladaPor}`}. El saldo pendiente es $0.00 y el asiento contable fue cancelado.
        </Alert>
      )}

      {/* Banner de Factura Revertida */}
      {isFullyReversed && (
        <Alert
          severity='info'
          icon={<i className='tabler-rotate-clockwise-2 text-lg text-[#6C5CE7]' />}
          sx={{
            borderRadius: '16px',
            backgroundColor: '#F3F0FF',
            color: '#4C3FAF',
            border: '1px solid #D8D0F8',
            fontWeight: 500,
            boxShadow: '0 4px 14px rgba(108, 92, 231, 0.1)'
          }}
        >
          Esta factura fue <strong>revertida en su totalidad</strong> mediante Nota de Crédito. Su saldo pendiente es $0.00.
        </Alert>
      )}

      {/* Banner de Nota de Crédito */}
      {currentInvoice?.tipoDocumento === 'NOTA_CREDITO' && currentInvoice.facturaAfectadaNumero && (
        <Alert
          severity='info'
          icon={<i className='tabler-receipt-refund text-lg text-[#6C5CE7]' />}
          sx={{
            borderRadius: '16px',
            backgroundColor: '#F3F0FF',
            color: '#4C3FAF',
            border: '1px solid #D8D0F8',
            fontWeight: 500,
            boxShadow: '0 4px 14px rgba(108, 92, 231, 0.1)'
          }}
        >
          Esta es una <strong>Nota de Crédito</strong> aplicada sobre la <strong>Factura {currentInvoice.facturaAfectadaNumero}</strong>.
          {currentInvoice.motivoNotaCredito && ` Motivo: "${currentInvoice.motivoNotaCredito}"`}.
        </Alert>
      )}

      {/* Tarjeta Principal de la Factura (Vista Completa) */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          p: 5
        }}
      >
        {/* Cabecera Maestro Limpia y Espaciosa (Sin helperText) */}
        <Box
          sx={{
            p: 4,
            mb: 4,
            backgroundColor: '#F8FAFC',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          {/* Fila 1: Contacto, Tipo de Documento y N° Comprobante */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.8fr 1.1fr 1.1fr' },
              gap: 3
            }}
          >
            <Autocomplete
              size='small'
              disabled={isReadOnly}
              options={dynamicContacts.filter(c => c.tipo === tipo)}
              value={dynamicContacts.find(c => c.id === contactoId) || null}
              onChange={(_, newVal) => {
                if (newVal) {
                  setContactoId(newVal.id)
                }
              }}
              getOptionLabel={c => `${c.nombre} (${c.rif})`}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              filterOptions={(options, state) => {
                const q = state.inputValue.toLowerCase().trim()
                if (!q) return options
                return options.filter(c =>
                  c.nombre.toLowerCase().includes(q) || c.rif.toLowerCase().includes(q)
                )
              }}
              renderOption={(props, opt) => (
                <li {...props} key={opt.id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, py: 0.5, width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B' }}>
                        {opt.nombre}
                      </Typography>
                      <Chip
                        label={opt.tipo === 'CUSTOMER' ? 'Cliente' : 'Proveedor'}
                        size='small'
                        sx={{
                          height: 20,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor:
                            opt.tipo === 'CUSTOMER' ? 'rgba(108, 92, 231, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: opt.tipo === 'CUSTOMER' ? '#6C5CE7' : '#D97706'
                        }}
                      />
                    </Box>
                    <Typography variant='caption' sx={{ color: '#64748B', fontFamily: 'monospace' }}>
                      RIF: {opt.rif}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={params => (
                <TextField
                  {...params}
                  label={isSupplier ? 'Proveedor / Beneficiario *' : 'Cliente (Cuentas por Cobrar) *'}
                  placeholder='Buscar por nombre o RIF...'
                  sx={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
                  }}
                />
              )}
            />

            <TextField
              select
              fullWidth
              size='small'
              label='Tipo de Documento'
              value={tipoDocumento}
              disabled={isReadOnly}
              onChange={e => setTipoDocumento(e.target.value as InvoiceDocumentType)}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            >
              <MenuItem value='FACTURA'>Factura Fiscal</MenuItem>
              <MenuItem value='NOTA_ENTREGA'>Nota de Entrega</MenuItem>
              <MenuItem value='RECIBO'>Recibo / Comprobante</MenuItem>
              <MenuItem value='NOTA_DEBITO'>Nota de Débito</MenuItem>
              {tipoDocumento === 'NOTA_CREDITO' && (
                <MenuItem value='NOTA_CREDITO' sx={{ display: 'none' }}>
                  Nota de Crédito
                </MenuItem>
              )}
            </TextField>

            <TextField
              fullWidth
              size='small'
              label='N° Documento / Control Fiscal'
              value={numeroFactura}
              disabled={isReadOnly}
              onChange={e => setNumeroFactura(e.target.value)}
              placeholder='Ej: FAC-2026-1827'
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            />
          </Box>

          {/* Fila 2: Moneda, Fechas, Tasa Oficial BCV y Documento Origen */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
              gap: 3
            }}
          >
            <TextField
              select
              fullWidth
              size='small'
              label='Moneda Operativa'
              value={moneda}
              disabled={isReadOnly}
              onChange={e => setMoneda(e.target.value as CurrencyCode)}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            >
              <MenuItem value='USD'>Dólares (USD $)</MenuItem>
              <MenuItem value='VES'>Bolívares (VES Bs.)</MenuItem>
            </TextField>

            <TextField
              fullWidth
              size='small'
              type='date'
              label='Fecha de Emisión'
              value={fechaEmision}
              disabled={isReadOnly}
              onChange={e => setFechaEmision(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            />

            <TextField
              fullWidth
              size='small'
              type='date'
              label='Fecha de Vencimiento'
              value={fechaVencimiento}
              disabled={isReadOnly}
              onChange={e => setFechaVencimiento(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            />

            <TextField
              fullWidth
              size='small'
              type='number'
              label='Tasa Oficial BCV'
              value={tasaBcv}
              disabled={isReadOnly}
              onChange={e => setTasaBcv(Number(e.target.value))}
              InputProps={{
                endAdornment: <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>Bs/USD</Typography>
              }}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            />

            <TextField
              fullWidth
              size='small'
              label='Documento Origen'
              value={documentoOrigen}
              disabled={isReadOnly}
              onChange={e => setDocumentoOrigen(e.target.value)}
              placeholder='Ej: COT-2026-0042 o OC-2026-0019'
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            />
          </Box>
        </Box>

        {/* Tabs de Contenido */}
        <Box sx={{ borderBottom: 1, borderColor: '#E6E4F0', mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem'
              },
              '& .Mui-selected': {
                color: '#6C5CE7 !important'
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#6C5CE7'
              }
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <i className='tabler-list-details' />
                  <span>{isSupplier ? 'Conceptos de Gasto / Servicio' : 'Líneas de Factura'} ({lineas.length})</span>
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <i className='tabler-scale' />
                  <span>Apuntes Contables</span>
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <i className='tabler-receipt-2' />
                  <span>Pagos Conciliados</span>
                  <Chip
                    label={pagosAsociados.length}
                    size='small'
                    sx={{
                      height: 20,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: pagosAsociados.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                      color: pagosAsociados.length > 0 ? '#10B981' : '#64748B'
                    }}
                  />
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <i className='tabler-receipt-refund' />
                  <span>Notas de Crédito</span>
                  <Chip
                    label={currentInvoice?.notasCreditoAplicadas?.length || 0}
                    size='small'
                    sx={{
                      height: 20,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor:
                        (currentInvoice?.notasCreditoAplicadas?.length || 0) > 0
                          ? 'rgba(108, 92, 231, 0.15)'
                          : 'rgba(148, 163, 184, 0.15)',
                      color:
                        (currentInvoice?.notasCreditoAplicadas?.length || 0) > 0
                          ? '#6C5CE7'
                          : '#64748B'
                    }}
                  />
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* Tab 0: Líneas de la Factura */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: '16px' }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 260 }}>
                      {isSupplier ? 'Descripción / Concepto del Gasto' : 'Concepto / Servicio'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 280 }}>
                      Cuenta Contable (Plan de Cuentas)
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 90 }}>Cant.</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 140 }}>Precio ($)</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 700, color: '#475569', width: 120 }}>IVA %</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 140 }}>Total ($)</TableCell>
                    {!isReadOnly && <TableCell align='center' sx={{ width: 60 }} />}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineas.map((line, idx) => (
                    <TableRow key={line.id || idx}>
                      <TableCell>
                        <Autocomplete
                          freeSolo
                          size='small'
                          disabled={isReadOnly}
                          options={CATALOG_PRODUCT_SUGGESTIONS.filter(p => p.tipo === tipo).map(p => p.nombre)}
                          value={line.productoOConcepto}
                          onInputChange={(_, newInputValue) => {
                            handleLineChange(idx, 'productoOConcepto', newInputValue)
                          }}
                          onChange={(_, newVal) => {
                            const chosenName = typeof newVal === 'string' ? newVal : newVal || ''
                            handleLineChange(idx, 'productoOConcepto', chosenName)

                            // Auto-completar precio y cuenta si coincide con catálogo predeterminado
                            const matchedProd = CATALOG_PRODUCT_SUGGESTIONS.find(
                              p => p.tipo === tipo && p.nombre.toLowerCase() === chosenName.toLowerCase()
                            )
                            if (matchedProd) {
                              if (matchedProd.precioUnitario && !line.precioUnitarioUsd) {
                                handleLineChange(idx, 'precioUnitarioUsd', matchedProd.precioUnitario)
                              }
                              if (matchedProd.cuentaId && eligibleAccounts.some(a => a.id === matchedProd.cuentaId)) {
                                handleLineChange(idx, 'cuentaContableId', matchedProd.cuentaId)
                              }
                            }
                          }}
                          renderInput={params => (
                            <TextField
                              {...params}
                              placeholder={
                                isSupplier
                                  ? 'Ej: Recibo Corpoelec, Alquiler mes, etc.'
                                  : 'Ej: Servicio de consultoría o mercancía'
                              }
                              sx={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: '10px',
                                '& .MuiOutlinedInput-root': { borderRadius: '10px', boxShadow: 'none !important' }
                              }}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Autocomplete
                          size='small'
                          disabled={isReadOnly}
                          options={eligibleAccounts}
                          value={eligibleAccounts.find(a => a.id === line.cuentaContableId) || null}
                          onChange={(_, newVal) => {
                            if (newVal) {
                              handleLineChange(idx, 'cuentaContableId', newVal.id)
                            }
                          }}
                          getOptionLabel={acc => `${acc.codigo} - ${acc.nombre}`}
                          isOptionEqualToValue={(opt, val) => opt.id === val.id}
                          filterOptions={(options, state) => {
                            const q = state.inputValue.toLowerCase().trim()
                            if (!q) return options
                            return options.filter(
                              a => a.codigo.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q)
                            )
                          }}
                          renderOption={(props, opt) => {
                            const typeLabel = opt.tipo.startsWith('INCOME')
                              ? 'Ingreso'
                              : opt.tipo === 'COST_OF_GOODS'
                              ? 'Costo'
                              : opt.tipo.startsWith('EXPENSE')
                              ? 'Gasto'
                              : 'Activo'

                            return (
                              <li {...props} key={opt.id}>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    width: '100%'
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography
                                      variant='body2'
                                      sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#6C5CE7' }}
                                    >
                                      {opt.codigo}
                                    </Typography>
                                    <Typography variant='body2' sx={{ color: '#1E293B', fontWeight: 500 }}>
                                      {opt.nombre}
                                    </Typography>
                                  </Box>
                                  <Typography
                                    variant='caption'
                                    sx={{
                                      fontWeight: 700,
                                      fontSize: '0.7rem',
                                      color: '#64748B',
                                      backgroundColor: '#F1F5F9',
                                      px: 1,
                                      py: 0.2,
                                      borderRadius: '4px'
                                    }}
                                  >
                                    {typeLabel}
                                  </Typography>
                                </Box>
                              </li>
                            )
                          }}
                          renderInput={params => (
                            <TextField
                              {...params}
                              placeholder='Buscar cuenta por código o nombre...'
                              sx={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: '10px',
                                '& .MuiOutlinedInput-root': { borderRadius: '10px', boxShadow: 'none !important' }
                              }}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <TextField
                          type='number'
                          size='small'
                          value={line.cantidad}
                          disabled={isReadOnly}
                          inputProps={{ min: 1, style: { textAlign: 'right' } }}
                          onChange={e => handleLineChange(idx, 'cantidad', e.target.value)}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <TextField
                          type='number'
                          size='small'
                          value={line.precioUnitarioUsd}
                          disabled={isReadOnly}
                          inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                          onChange={e => handleLineChange(idx, 'precioUnitarioUsd', e.target.value)}
                        />
                      </TableCell>
                      <TableCell align='center'>
                        <TextField
                          select
                          size='small'
                          value={line.tasaImpuestoPct}
                          disabled={isReadOnly}
                          onChange={e => handleLineChange(idx, 'tasaImpuestoPct', e.target.value)}
                        >
                          <MenuItem value={16}>16%</MenuItem>
                          <MenuItem value={8}>8%</MenuItem>
                          <MenuItem value={0}>Exento (0%)</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#1E293B', fontSize: '0.95rem' }}>
                        ${line.totalUsd.toFixed(2)}
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell align='center'>
                          <Tooltip title='Eliminar Línea'>
                            <span>
                              <IconButton
                                size='small'
                                disabled={lineas.length <= 1}
                                onClick={() => handleRemoveLine(idx)}
                                sx={{ color: '#EF4444' }}
                              >
                                <i className='tabler-trash' />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {!isReadOnly && (
              <Box>
                <Button
                  variant='outlined'
                  size='small'
                  startIcon={<i className='tabler-plus' />}
                  onClick={handleAddLine}
                  sx={{
                    borderRadius: '9999px',
                    borderColor: '#6C5CE7',
                    color: '#6C5CE7',
                    fontWeight: 600,
                    textTransform: 'none'
                  }}
                >
                  Agregar Línea
                </Button>
              </Box>
            )}

            {/* Sección Inferior: Términos y Condiciones a la izquierda + Desglose de Totales y Pagos a la derecha */}
            <Box
              sx={{
                p: 4,
                backgroundColor: '#F8FAFC',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
                gap: 4
              }}
            >
              {/* Izquierda: Términos y Condiciones */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <i className='tabler-notes' style={{ color: '#6C5CE7', fontSize: '1.2rem' }} />
                  <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E293B' }}>
                    Términos, Condiciones y Notas de Pago
                  </Typography>
                </Box>
                <Typography variant='caption' sx={{ color: '#64748B' }}>
                  {tipo === 'CUSTOMER'
                    ? 'Condiciones comerciales de la orden o notas de pago acordadas con el cliente:'
                    : 'Notas contables, condiciones de pago del proveedor o datos bancarios para liquidación:'}
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  size='small'
                  placeholder='Ingresa los términos de pago, cuentas bancarias, condiciones de entrega o notas...'
                  value={terminosCondiciones}
                  disabled={isReadOnly}
                  onChange={e => setTerminosCondiciones(e.target.value)}
                  sx={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    '& .MuiOutlinedInput-root': { borderRadius: '12px' }
                  }}
                />
              </Box>

              {/* Derecha: Desglose de Totales y Conciliación estilo Odoo */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pl: { md: 4 }, borderLeft: { md: '1px solid #E2E8F0' } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body2' sx={{ color: '#64748B' }}>Subtotal Neto:</Typography>
                  <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                    ${totalNetoUsd.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body2' sx={{ color: '#64748B' }}>IVA Calculado:</Typography>
                  <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                    ${totalIvaUsd.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ height: 1, backgroundColor: '#E2E8F0', my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant='subtitle1' sx={{ fontWeight: 700, color: '#1E293B' }}>Total Documento:</Typography>
                  <Typography variant='h5' sx={{ fontWeight: 800, color: '#6C5CE7' }}>
                    ${totalUsd.toFixed(2)} USD
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant='caption' sx={{ color: '#64748B' }}>Equivalente Legal (BCV):</Typography>
                  <Typography variant='body1' sx={{ fontWeight: 700, color: '#10B981' }}>
                    {totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                  </Typography>
                </Box>

                {/* Resumen de Amortización / Conciliación Odoo */}
                {currentInvoice && currentInvoice.estado !== 'DRAFT' && (
                  <Box
                    sx={{
                      mt: 1.5,
                      pt: 1.5,
                      borderTop: '1px dashed #CBD5E1',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant='body2' sx={{ color: '#64748B' }}>Total Pagado / Abonado:</Typography>
                      <Typography variant='body2' sx={{ fontWeight: 700, color: '#10B981' }}>
                        ${totalPagadoUsd.toFixed(2)} USD ({totalPagadoVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.)
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B' }}>Saldo Pendiente:</Typography>
                      <Typography variant='subtitle1' sx={{ fontWeight: 900, color: saldoPendienteUsd <= 0.01 ? '#10B981' : '#EF4444' }}>
                        ${saldoPendienteUsd.toFixed(2)} USD
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* Tab 1: Asiento Automático */}
        {activeTab === 1 && (
          <AutomaticEntryPreview items={entryPreviewItems} tasaBcv={tasaBcv} />
        )}

        {/* Tab 2: Historial de Pagos Conciliados */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B' }}>
                Pagos y Cobros Conciliados con este Documento
              </Typography>
              <Typography variant='body2' sx={{ color: '#64748B' }}>
                Abonos registrados en tesorería y vinculados con esta factura (Doble partida automática)
              </Typography>
            </Box>

            {pagosAsociados.length === 0 ? (
              <Box
                sx={{
                  p: 6,
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '16px',
                  border: '1px dashed #CBD5E1'
                }}
              >
                <i className='tabler-receipt-off' style={{ fontSize: '2.5rem', color: '#94A3B8' }} />
                <Typography variant='subtitle1' sx={{ fontWeight: 700, color: '#475569', mt: 1 }}>
                  No se han registrado pagos para este comprobante
                </Typography>
                <Typography variant='body2' sx={{ color: '#94A3B8', maxWidth: 460, mx: 'auto', mt: 0.5 }}>
                  El documento mantiene su saldo pendiente total de ${saldoPendienteUsd.toFixed(2)} USD ({saldoPendienteVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.).
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                <Table>
                  <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>N° Comprobante Pago</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Fecha</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Diario de Tesorería</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Método</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Referencia</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#10B981' }}>Abono (USD)</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 600, color: '#475569' }}>Abono (VES)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagosAsociados.map(pago => (
                      <TableRow key={pago.id || pago.pagoId}>
                        <TableCell sx={{ fontWeight: 700, color: '#6C5CE7' }}>
                          {pago.numeroPago}
                        </TableCell>
                        <TableCell sx={{ color: '#475569' }}>
                          {pago.fecha}
                        </TableCell>
                        <TableCell sx={{ color: '#1E293B', fontWeight: 600 }}>
                          {pago.diarioNombre}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={pago.metodoPago}
                            size='small'
                            sx={{ fontWeight: 700, fontSize: '0.75rem', backgroundColor: '#F1F5F9', color: '#475569' }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#64748B' }}>
                          {pago.referenciaBancaria || 'Sin referencia'}
                        </TableCell>
                        <TableCell align='right' sx={{ fontWeight: 700, color: '#10B981' }}>
                          ${pago.montoUsd.toFixed(2)}
                        </TableCell>
                        <TableCell align='right' sx={{ fontWeight: 600, color: '#475569' }}>
                          {pago.montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Tab 3: Notas de Crédito Aplicadas */}
        {activeTab === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B' }}>
                  Notas de Crédito Aplicadas a esta Factura
                </Typography>
                <Typography variant='body2' sx={{ color: '#64748B' }}>
                  Ajustes, devoluciones y amortizaciones de saldo registradas en el libro fiscal
                </Typography>
              </Box>

              {currentInvoice && currentInvoice.estado !== 'DRAFT' && currentInvoice.estado !== 'CANCELED' && currentInvoice.tipoDocumento !== 'NOTA_CREDITO' && (
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<i className='tabler-receipt-refund' />}
                  onClick={() => setCreditNoteModalOpen(true)}
                  sx={{
                    borderRadius: '9999px',
                    backgroundColor: '#6C5CE7',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 3,
                    '&:hover': { backgroundColor: '#5B4CDB' }
                  }}
                >
                  Emitir Nota de Crédito
                </Button>
              )}
            </Box>

            {(!currentInvoice?.notasCreditoAplicadas || currentInvoice.notasCreditoAplicadas.length === 0) ? (
              <Box
                sx={{
                  p: 6,
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '16px',
                  border: '1px dashed #CBD5E1'
                }}
              >
                <i className='tabler-receipt-refund text-4xl text-[#94A3B8] mb-2' />
                <Typography variant='subtitle1' sx={{ fontWeight: 700, color: '#475569', mt: 1 }}>
                  No hay notas de crédito aplicadas
                </Typography>
                <Typography variant='body2' sx={{ color: '#94A3B8', maxWidth: 460, mx: 'auto', mt: 0.5 }}>
                  Puedes emitir una nota de crédito para realizar devoluciones parciales de mercancía, otorgar descuentos comerciales o anular la factura legalmente.
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                <Table>
                  <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>N° Nota de Crédito</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Fecha de Emisión</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Motivo Comercial / Fiscal</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#6C5CE7' }}>Monto Acreditado (USD)</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 600, color: '#475569' }}>Monto (VES)</TableCell>
                      <TableCell sx={{ color: '#64748B' }}>Fecha de Registro</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentInvoice.notasCreditoAplicadas.map(nc => (
                      <TableRow key={nc.id}>
                        <TableCell sx={{ fontWeight: 700, color: '#6C5CE7' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <i className='tabler-receipt-refund text-base' />
                            <span>{nc.numeroNotaCredito}</span>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: '#475569' }}>{nc.fecha}</TableCell>
                        <TableCell sx={{ color: '#1E293B', fontWeight: 600 }}>{nc.motivo}</TableCell>
                        <TableCell align='right' sx={{ fontWeight: 700, color: '#6C5CE7' }}>
                          ${nc.montoUsd.toFixed(2)}
                        </TableCell>
                        <TableCell align='right' sx={{ fontWeight: 600, color: '#475569' }}>
                          {nc.montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                        </TableCell>
                        <TableCell sx={{ color: '#64748B', fontSize: '0.85rem' }}>{nc.creadoEn}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Card>

      {/* Modal para Registrar Pago Directo */}
      {currentInvoice && (
        <RegisterInvoicePaymentModal
          open={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          invoice={currentInvoice}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Modal para Anular Factura */}
      {currentInvoice && (
        <CancelInvoiceModal
          open={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          invoice={currentInvoice}
          onSuccess={handleCancelSuccess}
        />
      )}

      {/* Modal para Emitir Nota de Crédito */}
      {currentInvoice && (
        <CreateCreditNoteModal
          open={creditNoteModalOpen}
          onClose={() => setCreditNoteModalOpen(false)}
          invoice={currentInvoice}
          onSuccess={handleCreditNoteSuccess}
        />
      )}

      {/* Toast Feedback */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity='success' onClose={() => setToastMessage(null)} sx={{ borderRadius: '12px', fontWeight: 600 }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
