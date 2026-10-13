const LEADS = [
  "hosts a page that asks visitors to send a Pix",
  "collects payment through a Pix form",
  "asks visitors to pay with a Pix message",
  "opens a payment form after the Pix button",
  "shows a fake page that requests a Pix",
  "routes visitors to a Pix checkout",
  "displays a form that collects Pix payments",
  "prompts visitors to send money by Pix",
  "hosts a lookalike page demanding a Pix",
  "presents a Pix payment request as a message",
  "collects a username and a Pix amount",
  "serves a page whose button starts a Pix charge",
  "asks for a paid message through Pix",
  "shows a checkout that takes Pix transfers",
  "loads a payment modal for a Pix",
  "publishes a page that funnels people into Pix",
  "displays a branded form that charges by Pix",
  "captures payment details on a Pix screen",
  "offers a fake recado that is actually a Pix",
  "hosts an imitation page with a Pix button",
  "asks visitors to continue into a Pix payment",
  "shows a yellow page that pushes a Pix",
  "collects money through an embedded Pix form",
  "presents a Pix request under a local brand name",
  "serves a phishing page that ends in a Pix charge",
];

const TAILS = [
  "",
  " and then shows a payment form",
  " after the visitor clicks the message button",
  " instead of a real public channel",
  " and asks for a username and an amount",
  " that imitates a local news brand",
  " to collect money from visitors",
  " when the visitor tries to send a recado",
  " and the next screen is a Pix checkout",
  " using the brand name on the payment form",
  " on a page the brand does not operate",
  " and the minimum charge is shown on the form",
  " before the visitor can send anything",
  " targeted at people who open the link",
  " with fields for name, message and value",
  " that looks like an official payment request",
  " and keeps the visitor on the payment step",
  " without any tie to the legitimate site",
  " so visitors pay by Pix",
  " while posing as the brand on the page",
  " and the form is a third-party Pix charge",
  " copied to look like a civic message box",
  " including a continue button into payment",
  " that requests money for a short message",
  " and hides that the action is a charge",
  " for people who received the link",
  " and presents the Pix as a recado",
  " where the only action is to pay",
  " matching the layout in the screenshot",
  " and the payment screen uses the same name",
  " under the name printed on the yellow page",
  " that the real outlet does not host",
  " and asks for the amount in Brazilian reais",
  " so the visitor believes the page is official",
  " and the button leads straight to Pix",
  " on a host that is not the brand",
  " after a lure about sending a message",
  " and the page exists to collect the Pix",
  " which only continues if the visitor pays",
  " and visitors are told to send the Pix there",
];

export function defangHost(host: string) {
  return host.trim().toLowerCase().replace(/\.$/, "").replace(/\./g, "[.]");
}

export function reportHost(urlOrHost: string) {
  const trimmed = urlOrHost.trim();
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withScheme).hostname.replace(/\.$/, "").toLowerCase();
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").split("/")[0]?.toLowerCase() || trimmed;
  }
}

export function buildPhishingTitles(urlOrHost: string, count: number) {
  const defanged = defangHost(reportHost(urlOrHost));
  const total = Math.max(0, Math.min(1000, count));
  const titles: string[] = [];
  const seen = new Set<string>();
  const push = (title: string) => {
    const clean = title.replace(/\s+/g, " ").trim();
    if (!clean || seen.has(clean) || titles.length >= total) return;
    seen.add(clean);
    titles.push(clean);
  };
  push(`${defanged} hosts a page that asks visitors to send a Pix`);
  push(`${defanged} collects payment through a Pix form`);
  for (const lead of LEADS) {
    for (const tail of TAILS) {
      push(`${defanged} ${lead}${tail}`);
      if (titles.length >= total) return titles;
    }
  }
  return titles;
}
