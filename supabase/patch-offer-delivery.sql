-- Método de entrega separado para página de oferta
alter table traffic_campaigns
  add column if not exists offer_delivery_method text not null default 'redirect';

alter table traffic_campaigns
  drop constraint if exists traffic_campaigns_offer_delivery_method_check;

alter table traffic_campaigns
  add constraint traffic_campaigns_offer_delivery_method_check
  check (offer_delivery_method in ('redirect', 'mirror', 'unpack'));
