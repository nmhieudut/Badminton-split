'use client';

import React from 'react';
import { QrSaveButton } from '../QrSaveButton';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface QrLightboxProps {
  name: string;
  url: string;
  onClose: () => void;
}

export const QrLightbox: React.FC<QrLightboxProps> = ({ name, url, onClose }) => (
  <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Mã QR của {name}</DialogTitle>
      </DialogHeader>

      <DialogBody className="space-y-3 text-center">
        { }
        <img
          src={url}
          alt={`Mã QR của ${name}`}
          className="mx-auto max-h-72 w-full rounded-xl border border-slate-200 bg-white object-contain p-2"
        />

        {/* Banking apps let you upload a QR image, so saving it to the device has to work. */}
        <div className="flex justify-center">
          <QrSaveButton url={url} personName={name} />
        </div>
      </DialogBody>
    </DialogContent>
  </Dialog>
);
