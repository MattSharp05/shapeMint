import React from 'react';
import { motion } from 'framer-motion';
import { Package, Truck, ExternalLink } from 'lucide-react';

interface OrderSummaryItem {
  label: string;
  value: string;
}

interface OrderStatusTrackerProps {
  thumbnailUrl?: string;
  statusTitle: string;
  statusDescription: string;
  itemName: string;
  itemDetails: string;
  itemPrice?: string;
  summary: OrderSummaryItem[];
  trackingStatus?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  onTrackOrder?: () => void;
  onClose: () => void;
}

const DELIVERY_ILLUSTRATION = '/delivery-scooter.webp';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 12, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({
  thumbnailUrl,
  statusTitle,
  statusDescription,
  itemName,
  itemDetails,
  itemPrice,
  summary,
  trackingStatus,
  trackingNumber,
  trackingUrl,
  onTrackOrder,
  onClose,
}) => {
  return (
    <motion.div
      className="max-w-md w-full mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header: Illustration + title */}
      <motion.div variants={itemVariants} className="text-center mb-6">
        <img
          src={DELIVERY_ILLUSTRATION}
          alt="Order Status"
          className="w-28 h-28 mx-auto mb-2 object-contain"
        />
        <h2 className="text-xl font-bold text-white">{statusTitle}</h2>
        <p className="text-sm text-white/50 mt-1">{statusDescription}</p>
      </motion.div>

      {/* Item card */}
      <motion.div variants={itemVariants} className="mb-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-4">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={itemName}
                className="w-16 h-16 rounded-lg bg-white/10 object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-white/10 shrink-0 flex items-center justify-center">
                <Package className="h-6 w-6 text-white/20" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{itemName}</p>
              <p className="text-sm text-white/40">{itemDetails}</p>
            </div>
            {itemPrice && (
              <p className="font-bold text-brand-accent shrink-0">{itemPrice}</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Order summary */}
      <motion.div variants={itemVariants} className="mb-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h3 className="font-semibold text-white">Order Summary</h3>
          {summary.map((line, index) => (
            <div key={index} className="flex justify-between items-start text-sm">
              <span className="text-white/40">{line.label}</span>
              <span className="text-white font-medium text-right ml-4">{line.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tracking info */}
      {trackingNumber && (
        <motion.div variants={itemVariants} className="mb-4">
          <div className="rounded-xl border border-brand-accent/30 bg-brand-accent/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-brand-accent" />
              <span className="font-semibold text-brand-accent text-sm">Tracking Information</span>
            </div>
            <div className="flex items-center justify-between">
              <code className="text-sm text-white bg-white/10 px-2 py-1 rounded">{trackingNumber}</code>
              {trackingUrl ? (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-brand-accent hover:text-brand-accent-dark font-medium"
                >
                  Track <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <a
                  href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-brand-accent hover:text-brand-accent-dark font-medium"
                >
                  Track with USPS <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Status message */}
      {trackingStatus && (
        <motion.div variants={itemVariants} className="text-center mb-4">
          <p className="text-xs text-brand-accent font-medium">{trackingStatus}</p>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div variants={itemVariants} className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-white/60 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
        >
          Close
        </button>
        {onTrackOrder && trackingNumber && (
          <button
            onClick={onTrackOrder}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-brand-dark bg-gradient-to-r from-brand-accent to-brand-accent-dark rounded-full hover:shadow-[0_0_20px_rgba(237,174,73,0.4)] transition-all flex items-center justify-center gap-2"
          >
            <Truck className="h-4 w-4" />
            Track Order
          </button>
        )}
      </motion.div>
    </motion.div>
  );
};
