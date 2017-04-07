defmodule Ask.MobileSurveyController do
  alias Ask.Runtime.{Broker, Reply}
  alias Ask.Respondent
  use Ask.Web, :controller

  def index(conn, %{"respondent_id" => _}) do
    conn
    |> put_layout({Ask.LayoutView, "mobile_survey.html"})
    |> render("index.html", user: nil)
  end

  def get_step(conn, %{"respondent_id" => respondent_id}) do
    sync_step(conn, respondent_id, :answer)
  end

  def send_reply(conn, %{"respondent_id" => respondent_id, "value" => value}) do
    sync_step(conn, respondent_id, value)
  end

  defp sync_step(conn, respondent_id, value) do
    respondent = Repo.get!(Respondent, respondent_id)

    step = case Broker.sync_step(respondent, value) do
      {:ok, reply} ->
        reply |> Reply.steps() |> hd
      _ -> %{
          type: "explanation",
          prompt: "The survey has ended",
        }
    end

    render(conn, "show_step.json", step: step)
  end
end
