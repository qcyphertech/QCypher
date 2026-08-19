-- bundle_emoji_icon used to hold a free-typed emoji character; the UI now
-- writes one of a fixed set of icon keys instead (sparkles, gift, wrench,
-- star, zap, trending-up — see apps/web/src/lib/bundle-icons.tsx). Any
-- existing row still holding a raw emoji (not one of those keys) won't
-- match the new lookup and would render nothing — null it out instead so
-- it falls back to the default icon.
update tenant_upsell_rules
set bundle_emoji_icon = null
where bundle_emoji_icon is not null
  and bundle_emoji_icon !~ '^(sparkles|gift|wrench|star|zap|trending-up)$';
