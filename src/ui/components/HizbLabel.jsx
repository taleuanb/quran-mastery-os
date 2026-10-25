import React from 'react';
import { hizbInfo } from '../../domain/referential';
import { t } from '../strings.fr';

/**
 * Étiquette d'un hizb : numéro, nom arabe, sourate et, si fourni, « الثمن n/8 ».
 * @param {{hizb: number, thumun?: number, showName?: boolean, showSurah?: boolean}} props
 */
export default function HizbLabel({ hizb, thumun, showName = true, showSurah = true }) {
  const info = hizbInfo(hizb);
  return (
    <div className="row hizb-label">
      <div className="hnum"><small>{t('hizb.short')}</small>{hizb}</div>
      <div className="grow">
        {showName && <div className="ar name" dir="rtl">{info.hizbName}</div>}
        <div className="sub">
          {showSurah && <span className="ar" dir="rtl">{t('hizb.surah', { name: info.surah })}</span>}
          {thumun != null && (
            <>
              {showSurah && ' · '}
              <span className="ar" dir="rtl">{t('hizb.thumun', { n: thumun })}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
