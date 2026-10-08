import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as maplibregl from 'maplibre-gl';

interface MapMarkerProps {
  map: maplibregl.Map;
  lngLat: [number, number];
  // Pin drawn as a DOM element; its bottom-centre sits on the coordinate unless `anchor` says otherwise
  children: React.ReactNode;
  anchor?: 'bottom' | 'center';
  // Content shown while hovering the pin
  tooltip?: React.ReactNode;
  // Content of the popup opened by clicking the pin
  popup?: React.ReactNode;
  popupClassName?: string;
  // Vertical distance (px) between the coordinate and the popup/tooltip tip
  offset?: number;
  onClick?: () => void;
  // Like Leaflet's autoPan: keep the popup above the pin and pan the map until it is fully visible
  autoPan?: boolean;
}

// Extra room at the top keeps the popup clear of the floating toolbar
// Like Leaflet, only one popup is open at a time
let activePopup: maplibregl.Popup | null = null;

const AUTO_PAN_PADDING = { top: 88, side: 16 };

/**
 * A MapLibre marker whose pin, tooltip and popup are React trees (rendered through portals),
 * standing in for react-leaflet's <Marker>/<Tooltip>/<Popup>.
 */
const MapMarker: React.FC<MapMarkerProps> = ({
  map, lngLat, children, anchor = 'bottom', tooltip, popup, popupClassName, offset = 0, onClick, autoPan = false
}: MapMarkerProps) => {
  const [elements] = useState(() => ({
    pin: document.createElement('div'),
    tooltip: document.createElement('div'),
    popup: document.createElement('div'),
  }));
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;
  const hasPopup = popup !== undefined;
  // The tooltip can come and go without rebuilding the marker (which would close an open popup)
  const hasTooltipRef = useRef(false);
  hasTooltipRef.current = tooltip !== undefined;

  useEffect(() => {
    elements.pin.style.cursor = 'pointer';
    const marker = new maplibregl.Marker({ element: elements.pin, anchor }).setLngLat(lngLat).addTo(map);
    markerRef.current = marker;

    const popupOffset: maplibregl.Offset = anchor === 'bottom' ? [0, -offset] : offset;
    let popupInstance: maplibregl.Popup | null = null;
    if (hasPopup) {
      popupInstance = new maplibregl.Popup({
        offset: popupOffset, className: popupClassName, maxWidth: 'none', focusAfterOpen: false,
        anchor: autoPan ? 'bottom' : undefined,
      }).setDOMContent(elements.popup);
      marker.setPopup(popupInstance);
      const thisPopup = popupInstance;
      thisPopup.on('open', () => {
        if (activePopup && activePopup !== thisPopup) activePopup.remove();
        activePopup = thisPopup;
      });
      thisPopup.on('close', () => {
        if (activePopup === thisPopup) activePopup = null;
      });
      if (autoPan) {
        const popupRef = popupInstance;
        popupRef.on('open', () => {
          // Wait one frame so the popup has its final size and position
          requestAnimationFrame(() => {
            const box = popupRef.getElement()?.getBoundingClientRect();
            if (!box) return;
            const view = map.getContainer().getBoundingClientRect();
            const { top, side } = AUTO_PAN_PADDING;
            const dx = box.left < view.left + side ? box.left - view.left - side
              : box.right > view.right - side ? box.right - view.right + side : 0;
            const dy = box.top < view.top + top ? box.top - view.top - top
              : box.bottom > view.bottom - side ? box.bottom - view.bottom + side : 0;
            if (dx || dy) map.panBy([dx, dy], { duration: 300 });
          });
        });
      }
    }

    const tooltipInstance = new maplibregl.Popup({
      offset: popupOffset, className: 'photo-map-tooltip', closeButton: false, closeOnClick: false, maxWidth: 'none'
    }).setDOMContent(elements.tooltip);
    const showTooltip = () => {
      if (hasTooltipRef.current && !popupInstance?.isOpen()) tooltipInstance.setLngLat(marker.getLngLat()).addTo(map);
    };
    const hideTooltip = () => tooltipInstance.remove();
    const handleClick = (e: MouseEvent) => {
      // Keep the click on the pin from also selecting the data point underneath
      e.stopPropagation();
      hideTooltip();
      if (popupInstance) marker.togglePopup();
      onClickRef.current?.();
    };
    elements.pin.addEventListener('mouseenter', showTooltip);
    elements.pin.addEventListener('mouseleave', hideTooltip);
    elements.pin.addEventListener('click', handleClick);

    return () => {
      elements.pin.removeEventListener('mouseenter', showTooltip);
      elements.pin.removeEventListener('mouseleave', hideTooltip);
      elements.pin.removeEventListener('click', handleClick);
      tooltipInstance.remove();
      popupInstance?.remove();
      marker.remove();
      markerRef.current = null;
    };
    // lngLat is applied by the effect below, so moving the pin does not rebuild it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, elements, anchor, offset, popupClassName, hasPopup, autoPan]);

  useEffect(() => {
    markerRef.current?.setLngLat(lngLat);
  }, [lngLat[0], lngLat[1]]);

  return (
    <>
      {createPortal(children, elements.pin)}
      {tooltip !== undefined && createPortal(tooltip, elements.tooltip)}
      {hasPopup && createPortal(popup, elements.popup)}
    </>
  );
};

export default MapMarker;
