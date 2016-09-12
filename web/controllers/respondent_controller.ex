defmodule Ask.RespondentController do
  use Ask.Web, :controller

  alias Ask.Respondent

  def index(conn,  %{"survey_id" => survey_id}) do
    respondents = Repo.all(from r in Respondent, where: r.survey_id == ^survey_id)
    render(conn, "index.json", respondents: respondents)
  end

  def create(conn, %{"file" => file, "survey_id" => survey_id}) do
    {integer_survey_id, _ } = Integer.parse survey_id
    {:ok, local_time } = Ecto.DateTime.cast :calendar.local_time()

    if Path.extname(file.filename) == ".csv" do
      entries = File.stream!(file.path) |>
      CSV.decode(separator: ?\t) |>
      Enum.map(fn row ->
        %{phone_number: Enum.at(row, 0), survey_id: integer_survey_id, inserted_at: local_time, updated_at: local_time}
      end)

      Repo.insert_all(Respondent, entries)

      respondents = Repo.all(from r in Respondent, where: r.survey_id == ^survey_id)

      render(conn, "index.json", respondents: respondents)
    else
      conn
        |> put_status(:unprocessable_entity)
        |> render(Ask.ChangesetView, "error.json", changeset: file)
    end
  end

  def delete(conn, %{"id" => id}) do
    respondent = Repo.get!(Respondent, id)

    # Here we use delete! (with a bang) because we expect
    # it to always work (and if it does not, it will raise).
    Repo.delete!(respondent)

    send_resp(conn, :no_content, "")
  end
end