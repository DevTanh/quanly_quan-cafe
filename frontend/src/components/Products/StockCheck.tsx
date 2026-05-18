import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardCheck, faCheckCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useStockCheck } from './hooks/useStockCheck';
import { ProgressBar } from './components/StockShared';
import StockInputTable from './components/StockInputTable';
import StockReviewTable from './components/StockReviewTable';
import StockHistory from './components/StockHistory';

const StockCheck: React.FC = () => {
  const s = useStockCheck();

  if (s.loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-3 text-gray-500 font-[Segoe_UI,sans-serif]">
        <FontAwesomeIcon icon={faSpinner} spin />
        <span>Đang tải dữ liệu tồn kho...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 font-[Segoe_UI,sans-serif]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-[18px] flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faClipboardCheck} className="text-[28px] text-green-500" />
          <div>
            <h1 className="text-[20px] font-black text-gray-900 m-0">Kiểm kho</h1>
            <p className="text-[12.5px] text-gray-400 m-0 mt-0.5">Đối chiếu tồn kho thực tế với hệ thống</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1">
          {(['check', 'history'] as const).map(t => (
            <button
              key={t}
              className={`relative flex items-center gap-1.5 px-[18px] py-[7px] border-none rounded-lg text-[13.5px] font-semibold cursor-pointer transition-all font-[inherit] ${s.tab === t
                  ? 'bg-white text-gray-900 shadow-[0_1px_4px_rgba(0,0,0,0.1)]'
                  : 'bg-transparent text-gray-500'
                }`}
              onClick={() => { s.setTab(t); if (t === 'check') s.setStep('input'); }}
            >
              {t === 'check' ? 'Phiếu kiểm kho' : 'Lịch sử'}
              {t === 'history' && s.history.length > 0 && (
                <span className="bg-green-500 text-white text-[10px] font-bold rounded-xl px-1.5 py-px">
                  {s.history.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      {s.tab === 'check' ? (
        <div className="flex-1 px-6 pt-4 pb-6 flex flex-col gap-3.5 overflow-y-auto [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-xl">

          {/* DONE */}
          {s.step === 'done' && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <FontAwesomeIcon icon={faCheckCircle} className="text-[56px] text-green-500" />
              <h2 className="text-[22px] font-black text-gray-900 m-0">Kiểm kho hoàn tất!</h2>
              <p className="text-sm text-gray-400 m-0">Tồn kho đã được cập nhật theo kết quả kiểm.</p>
            </div>
          )}

          {/* INPUT */}
          {s.step === 'input' && (
            <>
              <ProgressBar currentStep={0} />
              <StockInputTable
                mode={s.mode}
                setMode={(m) => { s.setMode(m); s.rows; }}
                finiteProducts={s.finiteProducts}
                filteredProducts={s.filteredProducts}
                categories={s.categories}
                search={s.search}
                setSearch={s.setSearch}
                filterCat={s.filterCat}
                setFilterCat={s.setFilterCat}
                checker={s.checker}
                setChecker={s.setChecker}
                checkerErr={s.checkerErr}
                setCheckerErr={s.setCheckerErr}
                activeRows={s.activeRows}
                isInRows={s.isInRows}
                getRow={s.getRow}
                getDiff={s.getDiff}
                toggleSelect={s.toggleSelect}
                setActual={s.setActual}
                setNote={s.setNote}
                rows={s.rows}
                stats={s.stats}
                onGoReview={s.handleGoReview}
                onReset={s.handleReset}
              />
            </>
          )}

          {/* REVIEW */}
          {s.step === 'review' && (
            <>
              <ProgressBar currentStep={1} />
              <StockReviewTable
                reviewItems={s.reviewItems}
                reviewStats={s.reviewStats}
                checker={s.checker}
                submitting={s.submitting}
                onApprove={s.handleApprove}
                onBack={() => s.setStep('input')}
              />
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 px-6 pt-4 pb-6 flex flex-col gap-3 overflow-y-auto [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-xl">
          <StockHistory history={s.history} />
        </div>
      )}
    </div>
  );
};

export default StockCheck;