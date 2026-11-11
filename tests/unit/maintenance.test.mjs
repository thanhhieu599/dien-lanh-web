// Thống kê bảo trì (admin/src/services/maintenance.ts), chạy bằng node.
import test from 'node:test';
import assert from 'node:assert/strict';
import {addMonths,contractViews,maintenanceStats,contractsFromOrders} from '../../admin/src/services/maintenance.ts';

const contracts=[
  {id:1,name:'A',phone:'0900000001',cycle_months:3,start_date:'2026-01-10',fee_per_visit:1000000,units:4,status:'active',source:'contract'},
  {id:2,name:'B',phone:'0900000002',cycle_months:6,start_date:'2026-10-01',fee_per_visit:500000,units:2,status:'active',source:'order'},
  {id:3,name:'C',phone:'0900000003',cycle_months:12,start_date:'2025-05-01',fee_per_visit:200000,units:1,status:'ended',source:'phone'},
];
const visits=[
  {id:1,contract_id:1,date:'2026-01-10',amount:1000000,paid:true,status:'done'},
  {id:2,contract_id:1,date:'2026-04-12',amount:1000000,paid:true,status:'done'},
  {id:3,contract_id:1,date:'2026-07-15',amount:1200000,paid:false,status:'done'},
  {id:4,contract_id:1,date:'2026-10-20',amount:0,paid:false,status:'scheduled'},
  {id:5,contract_id:3,date:'2025-05-01',amount:200000,paid:true,status:'done'},
];
const today='2026-11-11';

test('addMonths giữ ngày cuối tháng hợp lệ', () => {
  assert.equal(addMonths('2026-01-31',1),'2026-02-28');
  assert.equal(addMonths('2026-11-15',3),'2027-02-15');
  assert.equal(addMonths('2026-03-01',-3),'2025-12-01');
});

test('hạn tiếp theo = lần đã làm gần nhất + chu kỳ; lần đã hẹn không tính', () => {
  const [a,b,c]=contractViews(contracts,visits,today);
  assert.equal(a.lastVisit,'2026-07-15');
  assert.equal(a.nextDue,'2026-10-15');
  assert.equal(a.due,'overdue');
  assert.equal(a.visits,3);
  assert.equal(a.spend,3200000);
  assert.equal(a.unpaid,1200000);
  assert.equal(b.lastVisit,null);
  assert.equal(b.nextDue,'2026-10-01');
  assert.equal(c.nextDue,null,'khách đã kết thúc không còn hạn');
  assert.equal(c.due,'none');
});

test('thống kê trong kỳ: doanh thu, đã thu, trung bình, dự kiến, giữ chân', () => {
  const s=maintenanceStats(contracts,visits,{from:'2026-01-01',to:'2026-11-11',today});
  assert.equal(s.customers,3);
  assert.equal(s.active,2);
  assert.equal(s.ended,1);
  assert.equal(s.units,6);
  assert.equal(s.revenue,3200000);
  assert.equal(s.paid,2000000);
  assert.equal(s.unpaid,1200000);
  assert.equal(s.visits,3);
  assert.equal(s.avgPerCustomer,3200000);
  assert.equal(s.avgPerVisit,1066667);
  assert.equal(s.expectedYear,1000000*4+500000*2);
  assert.equal(s.retention,0,'khách C đăng ký trước kỳ đã kết thúc');
  assert.equal(s.newInPeriod,2);
  assert.deepEqual(s.overdue.map(c=>c.id),[2,1]);
  assert.equal(s.months.length,11);
  assert.equal(s.months.find(m=>m.key==='2026-07').revenue,1200000);
  assert.deepEqual(s.top.map(c=>c.id),[1]);
  assert.deepEqual(s.byCycle.map(x=>x.key),['3','6','12']);
});

test('nhập khách từ đơn đã hoàn thành có chọn nhắc bảo trì, không trùng số điện thoại', () => {
  const orders=[
    {code:'DT1',status:'done',maintenance_optin:true,phone:'0900000002',customer:{name:'B',phone:'0900000002'},order_items:[{name:'Máy lạnh',qty:2}],created_at:'2026-09-01T00:00:00Z'},
    {code:'DT2',status:'done',maintenance_optin:true,phone:'0900000009',customer:{name:'Mới',phone:'0900000009'},shipping:{address:'1 Lê Lợi',province:'TP.HCM'},order_items:[{name:'Máy lạnh',qty:2},{name:'Tủ lạnh',qty:1}],created_at:'2026-09-01T00:00:00Z'},
    {code:'DT3',status:'done',maintenance_optin:true,phone:'0900000009',customer:{name:'Mới',phone:'0900000009'},order_items:[],created_at:'2026-09-02T00:00:00Z'},
    {code:'DT4',status:'pending',maintenance_optin:true,phone:'0900000010',order_items:[]},
    {code:'DT5',status:'done',maintenance_optin:false,phone:'0900000011',order_items:[]},
  ];
  const rows=contractsFromOrders(orders,contracts,today);
  assert.equal(rows.length,1);
  assert.equal(rows[0].phone,'0900000009');
  assert.equal(rows[0].units,3);
  assert.equal(rows[0].start_date,'2027-03-01');
  assert.equal(rows[0].address,'1 Lê Lợi, TP.HCM');
  assert.equal(rows[0].source,'order');
});
